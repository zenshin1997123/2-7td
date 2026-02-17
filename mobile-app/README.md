# 2-7 Triple Draw Poker - Expo React Native プロトタイプ

## 概要

2-7 Triple DrawポーカーゲームのExpo React Nativeプロトタイプです。

## セットアップ

### 必要な環境

- Node.js 16以上
- npm または yarn

### インストール

```bash
cd mobile-app
npm install
```

### 実行

```bash
# 開発サーバーを起動
npm start

# iOSシミュレーターで実行
npm run ios

# Androidエミュレーターで実行
npm run android

# Webブラウザで実行
npm run web
```

### 実機でテスト（Expo Go）

1. **Expo Goアプリをインストール**
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **QRコードをスキャン**
   - `npm start`を実行するとQRコードが表示されます
   - Expo GoアプリでQRコードをスキャンしてアプリを開きます

## プロジェクト構造

```
mobile-app/
├── src/
│   ├── game/           # ゲームロジック
│   │   ├── types.ts    # 型定義
│   │   ├── Card.ts     # カードユーティリティ
│   │   ├── Deck.ts     # デッキ管理
│   │   ├── Hand.ts     # ハンド評価
│   │   ├── Game.ts     # ゲーム状態管理
│   │   └── CPU.ts      # CPU AI
│   └── ui/             # UIコンポーネント
│       ├── components/ # 再利用可能コンポーネント
│       └── screens/    # 画面コンポーネント
├── App.tsx             # メインアプリ
├── app.json            # Expo設定
└── package.json
```

## 機能

- ✅ 2-7 Triple Drawの基本ルール実装
- ✅ CPU対戦
- ✅ ベッティング機能
- ✅ カード交換（ドロー）
- ✅ ショーダウン
- ✅ ハンド評価（Aローストレート対応）

## 今後の改善

- [ ] アニメーション追加
- [ ] サウンド効果
- [ ] データ永続化（AsyncStorage）
- [ ] 統計情報
- [ ] 難易度設定
- [ ] チュートリアル

## 開発メモ

このプロトタイプは、Python版のFlaskアプリからExpo React Native + TypeScriptへの移行プロトタイプです。

### 主な変更点

1. **ゲームロジックのクライアント側移行**
   - Pythonの`game_logic_27triple.py`をTypeScriptに移行
   - サーバー不要で動作

2. **ハンド評価の改善**
   - Aローストレートの検出を追加
   - 正確なハンド比較ロジック

3. **モバイルUI**
   - React Nativeコンポーネントで実装
   - タッチ操作に最適化

4. **Expoを使用**
   - 簡単なセットアップ
   - ネイティブプロジェクトの設定が不要
   - iOS/Android/Webで動作
