# セットアップガイド

## Expo React Nativeプロトタイプのセットアップ

### 1. 前提条件

#### 必要なソフトウェア
- **Node.js**: 16以上（推奨: 18 LTS）
- **npm** または **yarn**
- **Expo CLI**: `npm install -g expo-cli`（オプション）

#### iOS開発（macOSのみ）
- **Xcode**: 最新版（iOSシミュレーター用）
- **iOS Simulator**: Xcodeに含まれる

#### Android開発
- **Android Studio**: 最新版（Androidエミュレーター用）
- **Java Development Kit (JDK)**: 11以上

**注意**: Expoを使用する場合、ネイティブプロジェクトのセットアップは不要です。

### 2. プロジェクトのセットアップ

```bash
# プロジェクトディレクトリに移動
cd mobile-app

# 依存関係のインストール
npm install
```

### 3. 実行方法

#### 開発サーバーを起動

```bash
npm start
```

これでExpo開発サーバーが起動し、以下のオプションが表示されます：
- `i` - iOSシミュレーターで開く
- `a` - Androidエミュレーターで開く
- `w` - Webブラウザで開く
- QRコードをスキャンして実機で開く（Expo Goアプリが必要）

#### 直接実行

```bash
# iOSシミュレーターで実行
npm run ios

# Androidエミュレーターで実行
npm run android

# Webブラウザで実行
npm run web
```

### 4. 実機でテスト（Expo Go）

1. **Expo Goアプリをインストール**
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **QRコードをスキャン**
   - `npm start`を実行するとQRコードが表示されます
   - Expo GoアプリでQRコードをスキャンしてアプリを開きます

3. **同じWi-Fiネットワークに接続**
   - 開発マシンと実機が同じWi-Fiネットワークに接続されている必要があります

### 5. トラブルシューティング

#### 一般的な問題

**問題**: `npm start`でエラーが出る
```bash
# キャッシュをクリア
npm start -- --clear

# node_modulesを再インストール
rm -rf node_modules
npm install
```

**問題**: シミュレーター/エミュレーターが起動しない
- iOS: Xcodeでシミュレーターを手動で起動してから`npm run ios`
- Android: Android Studioでエミュレーターを起動してから`npm run android`

**問題**: Expo Goで接続できない
- 開発マシンと実機が同じWi-Fiネットワークに接続されているか確認
- ファイアウォールがポート19000をブロックしていないか確認
- `npm start -- --tunnel`でトンネルモードを試す

#### iOS

**問題**: シミュレーターが見つからない
- Xcodeを開いて、Preferences > Componentsでシミュレーターをインストール
- `xcrun simctl list devices`で利用可能なデバイスを確認

#### Android

**問題**: Android SDKが見つからない
- Android StudioでSDKのパスを確認
- `~/.bashrc`または`~/.zshrc`に環境変数を追加:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**問題**: エミュレーターが起動しない
- Android StudioでAVD Managerからエミュレーターを起動
- `adb devices`で接続を確認

### 6. プロジェクト構造の確認

```
mobile-app/
├── src/
│   ├── game/              # ゲームロジック（TypeScript）
│   │   ├── types.ts
│   │   ├── Card.ts
│   │   ├── Deck.ts
│   │   ├── Hand.ts
│   │   ├── Game.ts
│   │   └── CPU.ts
│   └── ui/                # UIコンポーネント
│       ├── components/
│       └── screens/
├── App.tsx                # メインアプリ
├── package.json
└── tsconfig.json
```

### 7. 次のステップ

1. **動作確認**
   - ゲームが正常に起動するか確認
   - 基本的な操作（ベット、ドロー、ショーダウン）が動作するか確認

2. **改善項目**
   - アニメーションの追加
   - サウンド効果
   - データ永続化（AsyncStorage）
   - UI/UXの改善

3. **テスト**
   - ユニットテストの追加
   - E2Eテストの実装

### 8. Expoの利点

- **簡単なセットアップ**: ネイティブプロジェクトの設定が不要
- **クロスプラットフォーム**: iOS/Android/Webで同じコードが動作
- **ホットリロード**: コード変更が即座に反映
- **実機テストが簡単**: Expo GoアプリでQRコードをスキャンするだけ

### 9. 参考リンク

- [Expo公式ドキュメント](https://docs.expo.dev/)
- [React Native公式ドキュメント](https://reactnative.dev/)
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/)
- [Expo Goアプリ](https://expo.dev/client)
