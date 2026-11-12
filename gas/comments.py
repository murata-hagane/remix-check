# リミックス自動チェックのコメントを読む／AIの返事を書く
#   python comments.py list [video]              … 全コメント（video を書けばその動画だけ）
#   python comments.py reply <video> <id> <返事>  … そのコメントに返事を書く（ページの「AIの返事」に出る）
# 受け口の URL は api_url.txt、合言葉は secret.txt（git には入れない）
import json, sys, urllib.request, pathlib

HERE = pathlib.Path(__file__).parent
API = (HERE / 'api_url.txt').read_text(encoding='utf-8').strip()
SECRET = (HERE / 'secret.txt').read_text(encoding='utf-8').strip()


def post(body):
    data = json.dumps(body, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(API, data=data, headers={'Content-Type': 'text/plain;charset=utf-8'})
    # Apps Script は POST のあと 302 で別ホストへ飛ぶ。urllib はそこを GET で追いかけるので、結果はそのまま読める
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def main(a):
    if not a or a[0] == 'list':
        r = post({'mine': 'all', 'secret': SECRET})
        if not r.get('ok'):
            print('読めませんでした:', r); return
        cs = [c for c in r['comments'] if len(a) < 2 or c['video'] == a[1]]
        for c in sorted(cs, key=lambda c: (c['video'], c['time'])):
            mark = '  ' if c.get('reply') else '未'
            print(f"{mark} [{c['video']}] id={c['id']} {c['time']:.1f}s ショット{c['shot']} {c.get('name') or '(名無し)'}：{c['comment']}")
            if c.get('reply'):
                print(f"       → {c['reply']}")
        print(f"{len(cs)}件（「未」＝まだ返事なし）")
    elif a[0] == 'reply' and len(a) >= 4:
        r = post({'mine': 'reply', 'secret': SECRET, 'video': a[1], 'id': a[2], 'reply': ' '.join(a[3:])})
        print('返事を書きました' if r.get('ok') else f'書けませんでした: {r}')
    else:
        print(__doc__ or open(__file__, encoding='utf-8').read().split('import')[0])


if __name__ == '__main__':
    main(sys.argv[1:])
