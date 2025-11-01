# 2-7 Triple Draw Poker Game

ブラウザで遊べる2-7トリプルドローポーカーゲームです。

## 機能

- プレイヤー vs CPU のヘッズアップ
- ブラインド、ベッティング、ドローラウンドの完全実装
- リアルなカード画像表示（deckofcardsapi.com使用）
- スタンドパット機能
- スタックの引き継ぎ

## ローカルで実行

```bash
pip install -r requirements.txt
export SECRET_KEY="your-secret-key-here"
python3 app_27triple.py
```

ブラウザで `http://localhost:5000` にアクセス

## Vercelでデプロイ

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. **Vercelでデプロイ**
   - https://vercel.com にアクセス
   - "Add New..." → "Project"
   - GitHubリポジトリを選択
   - 環境変数 `SECRET_KEY` を設定（ランダムな文字列）

3. **完了**
   - デプロイ完了後、提供されたURLでアクセス

## ファイル構成

```
2-7td/
├── api/
│   └── index.py          # Vercel用エントリーポイント
├── game_logic_27triple.py  # ゲームロジック
├── app_27triple.py       # Flaskアプリケーション
├── templates_27triple.html # HTMLテンプレート
├── requirements.txt      # Python依存関係
├── vercel.json          # Vercel設定
└── README.md            # このファイル
```

## 注意事項

- 現在の実装はメモリ内にゲーム状態を保持しています
- 複数ユーザーが同時にアクセスした場合、状態が混在する可能性があります
- 本番環境では必ず `SECRET_KEY` 環境変数を設定してください
