# 依存関係の修正方法

`metro-core`が見つからないエラーが発生している場合、以下の手順で修正してください。

## 解決方法

### 1. node_modulesを削除して再インストール

```bash
cd mobile-app
rm -rf node_modules
rm package-lock.json  # または yarn.lock
npm install
```

### 2. Expo CLIで依存関係を自動インストール

```bash
npx expo install --fix
```

このコマンドは、Expoプロジェクトに必要な依存関係を自動的にインストール・修正します。

### 3. 手動でMetro関連パッケージをインストール

```bash
npm install metro metro-core metro-react-native-babel-preset
```

### 4. 完全なクリーンインストール

```bash
cd mobile-app
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm cache clean --force
npm install
npx expo install --fix
```

## 推奨手順

最も確実な方法：

```bash
cd mobile-app

# 1. 既存の依存関係を削除
rm -rf node_modules
rm -rf .expo
rm package-lock.json

# 2. npmキャッシュをクリア
npm cache clean --force

# 3. 依存関係を再インストール
npm install

# 4. Expoで依存関係を修正
npx expo install --fix

# 5. アプリを起動
npm start
```

## トラブルシューティング

### yarnを使用する場合

```bash
cd mobile-app
rm -rf node_modules
rm yarn.lock
yarn install
yarn start
```

### まだエラーが出る場合

Expoのバージョンを確認：

```bash
npx expo --version
```

最新のExpo SDKに更新：

```bash
npx expo install expo@latest
```
