# クイックスタートガイド

## セットアップ（初回のみ）

ターミナルで以下のコマンドを実行してください：

```bash
cd mobile-app
npm install
```

**注意**: npmの権限エラーが出る場合、以下のいずれかを試してください：

1. **npxを使用**（推奨）:
   ```bash
   npx expo install
   ```

2. **yarnを使用**:
   ```bash
   yarn install
   ```

3. **npmの権限を修正**:
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

## 実行

依存関係のインストールが完了したら：

```bash
npm start
```

または

```bash
npx expo start
```

## トラブルシューティング

### `expo: command not found`エラー

`npx`を使用してください：

```bash
npx expo start
```

### npmの権限エラー

以下のコマンドで権限を修正：

```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ~/.nvm
```

または、yarnを使用：

```bash
yarn install
yarn start
```
