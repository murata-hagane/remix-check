// リミックス自動チェック：コメントの受け口（Google Apps Script ウェブアプリ）
// シート「comments」1枚にためる。列：id, video, time, shot, texts, name, comment, reply, own, created, replied
// GET  ?video=KEY            → その動画のコメント一覧（own は返さない）
// POST {video,time,shot,texts,comment,name}        → 保存。返りに id と own（消す時の合言葉）
// POST {mine:'delete', video, id, own}             → 自分のコメントを消す
// POST {mine:'reply', secret, video, id, reply}    → AI の返事を書く（secret はスクリプトのプロパティ ADMIN_SECRET）
// POST {mine:'all', secret}                        → 全コメント（返事を書くために読む）

const SHEET = 'comments';
const HEAD = ['id', 'video', 'time', 'shot', 'texts', 'name', 'comment', 'reply', 'own', 'created', 'replied'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(HEAD); sh.setFrozenRows(1); }
  return sh;
}
function rows_() {
  const sh = sheet_(), v = sh.getDataRange().getValues();
  return v.slice(1).map((r, i) => { const o = { _row: i + 2 }; HEAD.forEach((h, j) => o[h] = r[j]); return o; });
}
function pub_(r) {
  return { id: String(r.id), video: String(r.video), time: Number(r.time), shot: r.shot, texts: String(r.texts || ''), name: String(r.name || ''), comment: String(r.comment || ''), reply: String(r.reply || ''), created: String(r.created || '') };
}
function list_(video) {
  return rows_().filter(r => String(r.video) === video).sort((a, b) => a.time - b.time).map(pub_);
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function secretOk_(s) {
  const want = PropertiesService.getScriptProperties().getProperty('ADMIN_SECRET');
  return want && s && s === want;
}
function doGet(e) {
  const video = String((e && e.parameter && e.parameter.video) || '');
  if (!/^[0-9A-Za-z_\-]{1,80}$/.test(video)) return out_({ ok: false, error: 'video' });
  return out_({ ok: true, comments: list_(video) });
}
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out_({ ok: false, error: 'json' }); }
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (b.mine === 'all') {
      if (!secretOk_(b.secret)) return out_({ ok: false, error: 'secret' });
      return out_({ ok: true, comments: rows_().map(pub_) });
    }
    const video = String(b.video || '');
    if (!/^[0-9A-Za-z_\-]{1,80}$/.test(video)) return out_({ ok: false, error: 'video' });
    const sh = sheet_();
    if (b.mine === 'delete') {
      const r = rows_().find(x => String(x.id) === String(b.id) && String(x.video) === video);
      if (!r) return out_({ ok: false, error: 'notfound' });
      if (String(r.own) !== String(b.own || '')) return out_({ ok: false, error: 'own' });
      sh.deleteRow(r._row);
      return out_({ ok: true, comments: list_(video) });
    }
    if (b.mine === 'reply') {
      if (!secretOk_(b.secret)) return out_({ ok: false, error: 'secret' });
      const r = rows_().find(x => String(x.id) === String(b.id) && String(x.video) === video);
      if (!r) return out_({ ok: false, error: 'notfound' });
      sh.getRange(r._row, HEAD.indexOf('reply') + 1).setValue(String(b.reply || '').slice(0, 4000));
      sh.getRange(r._row, HEAD.indexOf('replied') + 1).setValue(new Date().toISOString());
      return out_({ ok: true, comments: list_(video) });
    }
    const comment = String(b.comment || '').trim().slice(0, 2000);
    if (!comment) return out_({ ok: false, error: 'empty' });
    const id = Utilities.getUuid().slice(0, 8), own = Utilities.getUuid();
    sh.appendRow([id, video, Number(b.time) || 0, b.shot || '', String(b.texts || '').slice(0, 500), String(b.name || '').slice(0, 40), comment, '', own, new Date().toISOString(), '']);
    return out_({ ok: true, id, own, comments: list_(video) });
  } finally { lock.releaseLock(); }
}
