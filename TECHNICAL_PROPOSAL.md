# 技術選定提案書

## 1. 推奨技術スタック

### 1.1 推奨: React Native + TypeScript

#### 理由
1. **学習コストが低い**
   - Web開発経験（HTML/CSS/JavaScript）を活かせる
   - 既存のコードベースから段階的に移行可能

2. **開発効率**
   - 1つのコードベースでiOS/Android両対応
   - ホットリロードで開発速度向上
   - 豊富なライブラリエコシステム

3. **パフォーマンス**
   - ネイティブコンポーネントを使用
   - ゲームロジックのような計算処理には十分な性能

4. **将来性**
   - Meta（Facebook）が積極的に開発
   - 大規模アプリでも実績あり

### 1.2 代替案

#### Flutter
- **メリット**: 高いパフォーマンス、統一されたUI
- **デメリット**: Dart言語の学習コスト、既存コードの再利用が困難

#### ネイティブ（Swift + Kotlin）
- **メリット**: 最高のパフォーマンスとUX
- **デメリット**: 2つのコードベース、開発コストが2倍

---

## 2. アーキテクチャ設計

### 2.1 全体構造

```
poker-app/
├── src/
│   ├── game/
│   │   ├── Card.ts              # カード定義・ユーティリティ
│   │   ├── Deck.ts              # デッキ管理
│   │   ├── Hand.ts              # ハンド評価ロジック
│   │   ├── Game.ts              # ゲーム状態管理
│   │   ├── Betting.ts           # ベッティングロジック
│   │   ├── CPU.ts               # CPU AI
│   │   └── types.ts             # 型定義
│   ├── ui/
│   │   ├── components/
│   │   │   ├── Card.tsx         # カードコンポーネント
│   │   │   ├── Hand.tsx         # ハンド表示
│   │   │   ├── Pot.tsx          # ポット表示
│   │   │   ├── Stack.tsx        # スタック表示
│   │   │   ├── ActionButton.tsx # アクションボタン
│   │   │   └── StatusPanel.tsx  # ステータスパネル
│   │   ├── screens/
│   │   │   ├── GameScreen.tsx   # メインゲーム画面
│   │   │   ├── MenuScreen.tsx   # メニュー画面
│   │   │   └── StatsScreen.tsx  # 統計画面
│   │   └── styles/
│   │       └── theme.ts          # テーマ定義
│   ├── storage/
│   │   ├── GameStorage.ts       # ゲームデータ永続化
│   │   └── StatsStorage.ts      # 統計データ管理
│   └── utils/
│       ├── animations.ts        # アニメーション
│       └── constants.ts         # 定数
├── assets/
│   ├── cards/                   # カード画像
│   └── sounds/                  # サウンド効果
├── __tests__/                   # テスト
└── package.json
```

### 2.2 データフロー

```
ユーザーアクション
    ↓
UI Component (React)
    ↓
Game State Manager (Game.ts)
    ↓
Game Logic (Hand.ts, Betting.ts)
    ↓
State Update
    ↓
UI Re-render
    ↓
Storage (永続化)
```

---

## 3. 移行計画

### 3.1 フェーズ1: ゲームロジックの移行（1-2週間）

#### 目標
PythonのゲームロジックをTypeScriptに完全移行し、テスト可能な状態にする。

#### タスク
1. **Card.ts の実装**
   ```typescript
   // Python: card_to_str, card_to_img_url
   // → TypeScript: Card型、ユーティリティ関数
   ```

2. **Deck.ts の実装**
   ```typescript
   // Python: Deck class
   // → TypeScript: Deck class (同様の機能)
   ```

3. **Hand.ts の実装**
   ```typescript
   // Python: Hand.rank_hand()
   // → TypeScript: Hand評価ロジック（最重要）
   ```

4. **Game.ts の実装**
   ```typescript
   // Python: Game class
   // → TypeScript: ゲーム状態管理
   ```

5. **Betting.ts の実装**
   ```typescript
   // Python: ベッティングロジック
   // → TypeScript: ベッティング管理
   ```

6. **CPU.ts の実装**
   ```typescript
   // Python: CPU AI
   // → TypeScript: CPU戦略
   ```

#### 検証方法
- ユニットテストでPython版と結果を比較
- 既存のテストケースをTypeScriptに移植

### 3.2 フェーズ2: 基本的なUI実装（2-3週間）

#### 目標
React Nativeで基本的なゲーム画面を実装し、ゲームが遊べる状態にする。

#### タスク
1. **プロジェクトセットアップ**
   ```bash
   npx react-native init PokerApp --template react-native-template-typescript
   ```

2. **基本コンポーネント**
   - Cardコンポーネント
   - Handコンポーネント
   - ActionButtonコンポーネント

3. **ゲーム画面**
   - カード表示
   - アクションボタン
   - ステータス表示

4. **ゲームロジック統合**
   - Game.tsとUIの連携
   - 状態管理（useState/useReducer）

### 3.3 フェーズ3: UX改善（2週間）

#### タスク
1. **アニメーション**
   - カード配布アニメーション
   - チップ移動アニメーション
   - トランジション効果

2. **レスポンシブデザイン**
   - 様々な画面サイズ対応
   - タッチ操作最適化

3. **フィードバック**
   - サウンド効果
   - 触覚フィードバック（バイブレーション）

### 3.4 フェーズ4: データ永続化（1週間）

#### タスク
1. **AsyncStorage統合**
   - ゲーム状態の保存
   - 統計情報の記録

2. **データモデル設計**
   - ゲーム履歴
   - 統計データ

### 3.5 フェーズ5: テスト・最適化（2週間）

#### タスク
1. **テスト実装**
   - ユニットテスト
   - 統合テスト
   - E2Eテスト

2. **パフォーマンス最適化**
   - レンダリング最適化
   - メモリ管理

### 3.6 フェーズ6: リリース準備（1-2週間）

#### タスク
1. **ストア申請準備**
   - アイコン作成
   - スクリーンショット
   - 説明文

2. **プライバシーポリシー**
   - データ収集の明記

---

## 4. 実装の優先順位

### 必須機能（MVP）
1. ✅ ゲームロジック（カード処理、ハンド評価）
2. ✅ ベッティング機能
3. ✅ CPU対戦
4. ✅ 基本的なUI
5. ✅ ゲーム進行

### 重要機能（v1.0）
1. データ永続化
2. アニメーション
3. サウンド効果
4. 統計情報

### 追加機能（v1.1以降）
1. 難易度設定
2. チュートリアル
3. アチーブメント
4. 設定画面

---

## 5. 技術的な考慮事項

### 5.1 パフォーマンス

#### 最適化ポイント
- **カード画像**: アセットとしてバンドル（外部API依存を排除）
- **レンダリング**: React.memoで不要な再レンダリングを防止
- **計算処理**: 重い計算はuseMemoでメモ化

### 5.2 状態管理

#### 選択肢
1. **useState/useReducer**（推奨）
   - シンプルなゲーム状態には十分
   - 学習コストが低い

2. **Redux/MobX**
   - 複雑な状態管理が必要な場合
   - 現時点では過剰の可能性

### 5.3 テスト戦略

#### テストレベル
1. **ユニットテスト**: ゲームロジック（Jest）
2. **コンポーネントテスト**: React Native Testing Library
3. **E2Eテスト**: Detox（オプション）

---

## 6. リスクと対策

### 6.1 技術リスク

#### リスク1: パフォーマンス問題
- **対策**: 早期にプロトタイプで検証、必要に応じて最適化

#### リスク2: プラットフォーム差異
- **対策**: 実機テストを早期に実施、プラットフォーム固有の処理を分離

### 6.2 開発リスク

#### リスク1: スケジュール遅延
- **対策**: MVPを明確に定義、段階的なリリース

#### リスク2: ルール実装の誤り
- **対策**: テストケースを充実、実際のルールと照合

---

## 7. 次のアクション

### 即座に実施
1. ✅ 要件定義書の作成
2. ✅ 技術選定の確定
3. ⏭️ プロトタイプの作成開始

### 検討事項
- [ ] React Native vs Flutter の最終決定
- [ ] デザインシステムの選定
- [ ] 開発環境のセットアップ

---

## 8. 参考実装例

### 8.1 カードコンポーネント（概念）

```typescript
// Card.tsx
import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';

interface CardProps {
  card: Card;
  selected?: boolean;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ card, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.selected]}
      onPress={onPress}
    >
      <Image source={getCardImage(card)} style={styles.image} />
    </TouchableOpacity>
  );
};
```

### 8.2 ゲーム状態管理（概念）

```typescript
// Game.ts
export class Game {
  private state: GameState;
  
  playerAction(action: Action): void {
    // アクション処理
    this.updateState();
  }
  
  private updateState(): void {
    // 状態更新
    this.notifyListeners();
  }
}
```

---

## 9. まとめ

### 推奨アプローチ
1. **技術スタック**: React Native + TypeScript
2. **開発方法**: 段階的な移行（ゲームロジック → UI → UX改善）
3. **リリース**: MVPから開始、段階的に機能追加

### 成功の鍵
- 明確な要件定義 ✅
- 段階的な開発
- 早期のプロトタイピング
- 継続的なテスト
