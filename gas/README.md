# コメント受け口（Google Apps Script）
- スプレッドシート「リミックス自動チェック コメント」（muratahagane@gmail.com の Drive）に紐づくスクリプト「remix-check コメント受け口」。
- Code.gs がその中身。直したら Apps Script 側に貼り直して「デプロイを管理 → 編集 → 新バージョン」で反映。
- api_url.txt = ウェブアプリの URL（index.html の API 定数と同じ）。secret.txt = 返事を書くための合言葉（スクリプトのプロパティ ADMIN_SECRET と同じ。git に入れない）。
- 読む／返事を書く： `python -X utf8 gas/comments.py list` ／ `python -X utf8 gas/comments.py reply <video> <id> <返事>`
