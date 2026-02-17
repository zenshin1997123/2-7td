# 2-7 Triple Draw ルール検証

## 1. ハンド評価ロジックの検証

### 1.1 現在の実装

```python
def rank_hand(self):
    vals = sorted([v for v, s in self.cards])
    suits = [s for v, s in self.cards]
    val_counter = Counter(vals)
    same_val = max(val_counter.values()) > 1
    is_flush = len(set(suits)) == 1
    is_straight = vals == list(range(vals[0], vals[0]+5))
    if is_flush or is_straight or same_val:
        return 99, vals  # ダメな手
    return max(vals), sorted(vals, reverse=True)
```

### 1.2 問題点の特定

#### 問題1: ストレート判定が不完全

**現在の実装**:
```python
is_straight = vals == list(range(vals[0], vals[0]+5))
```

**問題**:
- A-2-3-4-5（Aローストレート）を検出できない
- 例: [2, 3, 4, 5, 14] はストレートだが、`list(range(2, 7))` = `[2, 3, 4, 5, 6]` と一致しない

**修正案**:
```python
def is_straight(vals):
    # 通常のストレート
    if vals == list(range(vals[0], vals[0]+5)):
        return True
    # Aローストレート (A-2-3-4-5)
    if vals == [2, 3, 4, 5, 14]:
        return True
    return False
```

#### 問題2: ハンド比較ロジックが不正確

**現在の実装**:
```python
return max(vals), sorted(vals, reverse=True)
```

**問題**:
- `max(vals)` のみで比較しているが、2-7ロウでは全5枚の比較が必要
- 例: 
  - ハンドA: 2-3-4-5-8 → max=8
  - ハンドB: 2-3-4-6-7 → max=7
  - ハンドBの方が強いが、maxだけで比較すると正しい
  - しかし、2-3-4-5-7 vs 2-3-4-6-7 の場合、maxは同じ7だが、5枚目で比較が必要

**正確な比較方法**:
2-7ロウでは、**ハイカードから順に比較**する（小さい方が強い）
- ハイカードが同じ場合は、次のカードで比較
- 全て同じ場合は引き分け

**修正案**:
```python
def compare_hands(hand1_vals, hand2_vals):
    # 降順でソート（ハイカードから比較）
    h1 = sorted(hand1_vals, reverse=True)
    h2 = sorted(hand2_vals, reverse=True)
    
    for i in range(5):
        if h1[i] < h2[i]:
            return 1  # hand1が強い
        elif h1[i] > h2[i]:
            return -1  # hand2が強い
    return 0  # 引き分け
```

#### 問題3: 無効ハンド同士の比較

**現在の実装**:
```python
if is_flush or is_straight or same_val:
    return 99, vals  # ダメな手
```

**問題**:
- 全ての無効ハンドに99を返している
- 無効ハンド同士の比較が必要な場合がある（ルールによる）

**確認事項**:
- 一般的な2-7ロウでは、無効ハンドは全て「最弱」扱い
- 無効ハンド同士の場合は引き分け
- ただし、一部のルールでは無効ハンド同士でも比較する場合がある

**推奨実装**:
```python
def rank_hand(self):
    vals = sorted([v for v, s in self.cards])
    suits = [s for v, s in self.cards]
    
    # ペア・トリップ・フォーカードチェック
    val_counter = Counter(vals)
    has_pair = max(val_counter.values()) > 1
    
    # フラッシュチェック
    is_flush = len(set(suits)) == 1
    
    # ストレートチェック（Aロー含む）
    is_straight = self._is_straight(vals)
    
    # 無効ハンド
    if has_pair or is_flush or is_straight:
        return {
            'valid': False,
            'high_card': 14,  # 最弱扱い
            'ranks': sorted(vals, reverse=True)
        }
    
    # 有効なロウハンド
    return {
        'valid': True,
        'high_card': max(vals),
        'ranks': sorted(vals, reverse=True)  # 比較用に降順
    }

def _is_straight(self, vals):
    # 通常のストレート
    if vals == list(range(vals[0], vals[0]+5)):
        return True
    # Aローストレート
    if vals == [2, 3, 4, 5, 14]:
        return True
    return False
```

---

## 2. ベッティング構造の検証

### 2.1 現在の実装

```python
self.small_blind = 1
self.big_blind = 2
self.limit_small_bet = 2
self.limit_big_bet = 4
self.max_raises = 3
```

### 2.2 確認事項

#### Limit構造
- **プリドロー・第1ストリート**: スモールベット/スモールレイズ（2チップ）
- **第2・第3ストリート**: ビッグベット/ビッグレイズ（4チップ）
- **レイズ上限**: 通常3-4回

**現在の実装は正しい** ✅

#### ブラインド構造
- **ヘッズアップ（1対1）**: 
  - ディーラー（SB）: 1チップ
  - ビッグブラインド: 2チップ
  - プリドローはSBが先行

**現在の実装は正しい** ✅

### 2.3 改善が必要な点

#### オールイン処理
- **問題**: スタック不足時の処理が実装されていない
- **必要**: オールイン時のポット計算、サイドポットの処理

**実装例**:
```python
def _apply_bet(self, who, amount):
    stack = self.player_stack if who == 'player' else self.cpu_stack
    actual_bet = min(amount, stack)  # スタックを超えない
    
    if actual_bet < amount:
        # オールイン
        self._handle_all_in(who, actual_bet)
    else:
        # 通常のベット
        self._normal_bet(who, actual_bet)
```

---

## 3. ゲーム進行の検証

### 3.1 ストリート進行

**現在の実装**:
```python
self.street = 0  # 0: プリドロー, 1: 1st後, 2: 2nd後, 3: 3rd後
```

**確認**:
- ✅ プリドロー: ストリート0
- ✅ 第1ドロー後: ストリート1
- ✅ 第2ドロー後: ストリート2
- ✅ 第3ドロー後: ストリート3

**正しい** ✅

### 3.2 アクション順序

**プリドロー**:
- SB（プレイヤー）が先行 ✅

**ドロー後**:
- ボタンの左（CPU）が先行 ✅

**現在の実装は正しい** ✅

---

## 4. テストケース

### 4.1 ハンド評価のテストケース

#### 最強ハンド
```
カード: 2♠ 3♥ 4♦ 5♣ 7♠
期待: valid=True, high_card=7
```

#### 無効ハンド（ペア）
```
カード: 2♠ 2♥ 3♦ 4♣ 5♠
期待: valid=False
```

#### 無効ハンド（フラッシュ）
```
カード: 2♠ 3♠ 4♠ 5♠ 7♠
期待: valid=False
```

#### 無効ハンド（ストレート）
```
カード: 2♠ 3♥ 4♦ 5♣ 6♠
期待: valid=False
```

#### 無効ハンド（Aローストレート）
```
カード: A♠ 2♥ 3♦ 4♣ 5♠
期待: valid=False
```

#### ハンド比較
```
ハンドA: 2-3-4-5-8 (high=8)
ハンドB: 2-3-4-6-7 (high=7)
期待: ハンドBが強い
```

```
ハンドA: 2-3-4-5-7 (high=7)
ハンドB: 2-3-4-6-7 (high=7)
期待: ハンドAが強い（5枚目で比較: 5 < 6）
```

### 4.2 ベッティングのテストケース

#### レイズ上限
```
状況: レイズが3回済み
アクション: レイズ
期待: レイズ不可
```

#### オールイン
```
状況: プレイヤースタック=5, コール必要額=10
アクション: コール
期待: オールイン（5チップのみ）
```

---

## 5. 修正優先度

### 高優先度（必須）
1. ✅ **ストレート判定の修正**（Aロー対応）
2. ✅ **ハンド比較ロジックの修正**（全5枚の比較）

### 中優先度（推奨）
1. **オールイン処理の実装**
2. **無効ハンド同士の比較ルールの明確化**

### 低優先度（オプション）
1. **エッジケースの処理**
2. **ルールバリエーションの対応**

---

## 6. 実装チェックリスト

### ハンド評価
- [ ] ストレート判定（Aロー含む）
- [ ] ペア・トリップ・フォーカード判定
- [ ] フラッシュ判定
- [ ] 有効ハンドの正確な比較
- [ ] 無効ハンドの扱い

### ベッティング
- [ ] レイズ上限の実装
- [ ] オールイン処理
- [ ] ポット計算
- [ ] サイドポット（オールイン時）

### ゲーム進行
- [ ] ストリート進行
- [ ] アクション順序
- [ ] ラウンド終了条件
- [ ] ショーダウン処理

---

## 7. 参考資料

### 2-7 Triple Drawルール
- [PokerStars School](https://www.pokerstars.com/poker/games/triple-draw/)
- [Wikipedia - Lowball](https://en.wikipedia.org/wiki/Lowball_(poker))

### ハンド評価
- 2-7ロウでは、**最も弱いハンド**が勝ち
- 最強: 2-3-4-5-7（スートが異なる、ストレートでない、ペアなし）
- 無効: ストレート、フラッシュ、ペア以上

### 比較方法
- ハイカードから順に比較（小さい方が強い）
- 全て同じ場合は引き分け
