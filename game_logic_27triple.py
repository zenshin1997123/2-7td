import random
from collections import Counter

# カードスートとランク
SUITS = ['S', 'H', 'D', 'C']  # スペード、ハート、ダイヤ、クラブ
RANKS = list(range(2, 15))  # 2〜14（11:J, 12:Q, 13:K, 14:A）

CARD_RANK_MAP = {11: 'J', 12: 'Q', 13: 'K', 14: 'A'}
def card_to_str(card):
    rank, suit = card
    if rank in CARD_RANK_MAP:
        rank = CARD_RANK_MAP[rank]
    return f"{rank}{suit}"

def card_to_img_url(card):
    rank, suit = card
    faces = {11:'J', 12:'Q', 13:'K', 14:'A'}
    # deckofcardsapi の 10 は '0' 表記
    if rank == 10:
        rank_str = '0'
    else:
        rank_str = faces.get(rank, str(rank))
    suit_map = {'S':'S','H':'H','D':'D','C':'C'}
    url = f"https://deckofcardsapi.com/static/img/{rank_str}{suit_map[suit]}.png"
    return url

class Deck:
    def __init__(self):
        self.cards = [(rank, suit) for rank in RANKS for suit in SUITS]
        random.shuffle(self.cards)

    def draw(self, n):
        return [self.cards.pop() for _ in range(n)]

class Hand:
    def __init__(self, cards):
        self.cards = cards  # [(rank, suit), ...] のリスト
    
    def discard_and_draw(self, keep_indexes, deck):
        # keep_indexes: 残すカードのインデックス
        new_cards = [self.cards[i] for i in keep_indexes]
        num_discards = len(self.cards) - len(new_cards)
        new_cards += deck.draw(num_discards)
        self.cards = new_cards

    def to_str(self, show_all=True):
        if show_all:
            return ' '.join([card_to_str(c) for c in self.cards])
        else:
            return 'XX XX XX XX XX'

    # 役評価（2-7ロウ判定）
    def rank_hand(self):
        vals = sorted([v for v, s in self.cards])
        suits = [s for v, s in self.cards]
        val_counter = Counter(vals)
        same_val = max(val_counter.values()) > 1
        is_flush = len(set(suits)) == 1
        is_straight = vals == list(range(vals[0], vals[0]+5))
        # 2-7ロウハンド（2,3,4,5,7・スート・ストレート・ペアNG、7の一番弱い役が最強）
        if is_flush or is_straight or same_val:
            return 99, vals  # ダメな手
        return max(vals), sorted(vals, reverse=True)  # 最強は2,3,4,5,7の組み合わせ

class CPU:
    def __init__(self):
        pass
    def select_discard(self, hand):
        # 強いハンドはスタンドパット（ドローしない）
        rank, _ = hand.rank_hand()
        # 目安: 8以下（例: 7ロー相当）ならスタンドパット
        if rank <= 8:
            return [0,1,2,3,4]
        # シンプル: ペアやストレート・フラッシュ要素を捨てる志向
        vals = [v for v, s in hand.cards]
        suits = [s for v, s in hand.cards]
        counter = Counter(vals)
        # ペア優先で捨てる
        remove = [i for i, v in enumerate(vals) if counter[v] > 1]
        # ない場合、A,K,Q,J,8,9,10を優先して捨てる
        if not remove:
            remove = [i for i, v in enumerate(vals) if v > 7]
        # それでも5枚全部捨てることはしない。最低2枚は残すように
        keep = [i for i in range(5) if i not in remove]
        if len(keep) < 2:
            keep = sorted(range(5), key=lambda i: vals[i])[:2]
        return keep

class Player:
    def __init__(self):
        pass
    # UI側で保持、ここはダミー

class Game:
    def __init__(self, player_stack=100, cpu_stack=100):
        self.deck = Deck()
        self.player = Hand(self.deck.draw(5))
        self.cpu = Hand(self.deck.draw(5))
        # ドロー回数（0,1,2 の3回まで）
        self.turn = 0
        # ベット関連
        self.player_stack = player_stack
        self.cpu_stack = cpu_stack
        self.pot = 0
        self.small_blind = 1
        self.big_blind = 2
        self.limit_small_bet = 2
        self.limit_big_bet = 4
        self.max_raises = 3
        self.street = 0  # 0: プリドロー, 1: 1st後, 2: 2nd後, 3: 3rd後
        self.dealer_is_player = True  # ヘッズアップ: プレイヤーがボタン（SB）
        # ラウンド内状態
        self.current_bet = 0
        self.player_contrib = 0
        self.cpu_contrib = 0
        self.raises_this_round = 0
        self.to_act = 'player'  # アクター: 'player' or 'cpu'
        self.betting_open = True
        self.draw_phase = False
        self.hand_over = False
        self.check_pending = None  # 片方がチェック済みか: 'player' or 'cpu'
        self.cpu_last_action = None  # CPUの直近アクション文字列
        self.last_payout = None  # 直近の配当情報 {'type': 'fold'|'showdown'|'split', 'winner': 'player'|'cpu'|None, 'amount': int}
        # ブラインドをポストしてプリドローベッティングへ
        self._post_blinds_start_round()

    def player_discard(self, keep_indexes):
        self.player.discard_and_draw(keep_indexes, self.deck)
        self.turn += 1

    def cpu_discard(self):
        cpu_agent = CPU()
        keep_indexes = cpu_agent.select_discard(self.cpu)
        self.cpu.discard_and_draw(keep_indexes, self.deck)

    def showdown(self):
        pr, pv = self.player.rank_hand()
        cr, cv = self.cpu.rank_hand()
        if pr < cr:
            amt = self.pot
            self.player_stack += amt
            self.pot = 0
            self.hand_over = True
            self.last_payout = {'type': 'showdown', 'winner': 'player', 'amount': amt}
            return 'win', self.player.cards, self.cpu.cards
        elif pr > cr:
            amt = self.pot
            self.cpu_stack += amt
            self.pot = 0
            self.hand_over = True
            self.last_payout = {'type': 'showdown', 'winner': 'cpu', 'amount': amt}
            return 'lose', self.player.cards, self.cpu.cards
        else:
            # スプリット
            half = self.pot // 2
            rest = self.pot - half
            self.player_stack += half
            self.cpu_stack += rest
            self.pot = 0
            self.hand_over = True
            self.last_payout = {'type': 'split', 'winner': None, 'amount': half}
            return 'draw', self.player.cards, self.cpu.cards

    # ========== ベットラウンド制御 ==========
    def _bet_size(self):
        return self.limit_small_bet if self.street in (0, 1) else self.limit_big_bet

    def _post_blinds_start_round(self):
        # ヘッズアップ: ディーラ（プレイヤー）がSB、CPUがBB
        self.player_stack -= self.small_blind
        self.cpu_stack -= self.big_blind
        self.pot += self.small_blind + self.big_blind
        self.player_contrib = self.small_blind
        self.cpu_contrib = self.big_blind
        self.current_bet = self.big_blind
        self.raises_this_round = 0
        # プリドローはSB（プレイヤー）が先行
        self.to_act = 'player'
        self.betting_open = True
        self.draw_phase = False

    def _reset_round_contrib(self):
        self.current_bet = 0
        self.player_contrib = 0
        self.cpu_contrib = 0
        self.raises_this_round = 0
        self.check_pending = None

    def _start_betting_round_after_draw(self):
        # ドローのあとはボタンの左（CPU）が先行
        self.betting_open = True
        self.draw_phase = False
        self._reset_round_contrib()
        self.to_act = 'cpu'
        self.cpu_last_action = None

    def legal_actions_for_player(self):
        if not self.betting_open or self.hand_over:
            return []
        contrib = self.player_contrib
        if self.current_bet > contrib:
            actions = ['fold', 'call']
            if self.raises_this_round < self.max_raises:
                actions.append('raise')
            return actions
        else:
            # no bet faced
            actions = ['check']
            actions.append('bet')
            return actions

    def _apply_bet(self, who, amount):
        if who == 'player':
            self.player_stack -= amount
        else:
            self.cpu_stack -= amount
        self.pot += amount
        # ベットが入ればチェック状態はリセット
        self.check_pending = None

    def _call_to_current(self, who):
        if who == 'player':
            need = self.current_bet - self.player_contrib
            self.player_contrib += need
            self._apply_bet('player', need)
        else:
            need = self.current_bet - self.cpu_contrib
            self.cpu_contrib += need
            self._apply_bet('cpu', need)

    def _bet_or_raise(self, who):
        size = self._bet_size()
        if self.current_bet == 0:
            # ベット
            self.current_bet = size
            if who == 'player':
                self.player_contrib += size
                self._apply_bet('player', size)
            else:
                self.cpu_contrib += size
                self._apply_bet('cpu', size)
        else:
            # レイズ
            self.current_bet += size
            self.raises_this_round += 1
            if who == 'player':
                need = self.current_bet - self.player_contrib
                self.player_contrib += need
                self._apply_bet('player', need)
            else:
                need = self.current_bet - self.cpu_contrib
                self.cpu_contrib += need
                self._apply_bet('cpu', need)

    def _round_maybe_close(self):
        # 両者のコントリビューションが一致し、かつ誰も未行動でなければ終了
        if self.player_contrib == self.cpu_contrib and self.to_act is None:
            self.betting_open = False
            self.draw_phase = True if self.street < 3 else False
            self.check_pending = None
            return True
        return False

    def _advance_to_next_actor_after(self, who):
        # whoが行動したあとの次アクター設定
        self.to_act = 'cpu' if who == 'player' else 'player'

    def player_action(self, action):
        # プレイヤー行動を処理し、必要ならCPU応答まで実行
        if self.hand_over or not self.betting_open or self.to_act != 'player':
            return
        contrib = self.player_contrib
        if action == 'fold':
            self.betting_open = False
            self.hand_over = True
            # CPUがポット獲得
            amt = self.pot
            self.cpu_stack += amt
            self.pot = 0
            self.last_payout = {'type': 'fold', 'winner': 'cpu', 'amount': amt}
            return
        if self.current_bet > contrib:
            # フェイスしている
            if action == 'call':
                self._call_to_current('player')
                # 相手のアクション待ちなし → ラウンド終了
                self.to_act = None
                # プレイヤーのコールでラウンドが収束した場合は即時クローズ判定
                self._round_maybe_close()
            elif action == 'raise' and self.raises_this_round < self.max_raises:
                self._bet_or_raise('player')
                self._advance_to_next_actor_after('player')
            else:
                return
        else:
            # ベットなし
            if action == 'check':
                # 連続チェックでなければ相手へ、連続ならラウンド終了
                if self.check_pending is None:
                    self.check_pending = 'player'
                    self.to_act = 'cpu'
                else:
                    # プレイヤーがチェック済みならここには来ない想定
                    self.to_act = None
                    # 両者チェック完了時は即時クローズ判定
                    self._round_maybe_close()
            elif action == 'bet':
                self._bet_or_raise('player')
                self._advance_to_next_actor_after('player')
            else:
                return
        # CPUの自動応答を必要に応じて実行
        self._cpu_auto_until_player_turn_or_round_end()

    def _cpu_choose_action(self):
        # ごく簡単な方針: ハンド評価に応じて
        rank, _ = self.cpu.rank_hand()
        contrib = self.cpu_contrib
        facing_bet = self.current_bet > contrib
        size = self._bet_size()
        # 強さ目安: rank小さいほど強い（2-7）
        if facing_bet:
            if rank <= 8:
                # 強めならレイズ（余裕あれば）/なければコール
                if self.raises_this_round < self.max_raises:
                    return 'raise'
                return 'call'
            elif rank <= 11:
                return 'call'
            else:
                # 弱ければフォールドも
                # ただし小額（small bet）ならコールすることも
                return 'fold' if size == self.limit_big_bet else 'call'
        else:
            if rank <= 8:
                return 'bet'
            else:
                return 'check'

    def _cpu_auto_until_player_turn_or_round_end(self):
        # 連続でCPUが行動すべき場合に処理
        while self.betting_open and not self.hand_over and self.to_act == 'cpu':
            action = self._cpu_choose_action()
            self.cpu_last_action = action
            if action == 'fold':
                self.betting_open = False
                self.hand_over = True
                amt = self.pot
                self.player_stack += amt
                self.pot = 0
                self.last_payout = {'type': 'fold', 'winner': 'player', 'amount': amt}
                return
            if self.current_bet > self.cpu_contrib:
                if action == 'call':
                    self._call_to_current('cpu')
                    self.to_act = None  # ラウンド終了条件へ
                elif action == 'raise' and self.raises_this_round < self.max_raises:
                    self._bet_or_raise('cpu')
                    self.to_act = 'player'
                else:
                    # 不正/想定外はコールにフォールバック
                    self._call_to_current('cpu')
                    self.to_act = None
            else:
                if action == 'bet':
                    self._bet_or_raise('cpu')
                    self.to_act = 'player'
                else:
                    # check 処理: 連続チェックなら終了、そうでなければプレイヤーへ
                    if self.check_pending is None:
                        self.check_pending = 'cpu'
                        self.to_act = 'player'
                    else:
                        # すでに相手がチェック済み → ラウンド終端
                        self.to_act = None
            if self._round_maybe_close():
                # 次のフェーズへ（ドローまたはショーダウン手前）
                break
        # ラウンド終了処理
        if not self.betting_open and self.street < 3 and not self.hand_over:
            # ドロー可能へ
            self.draw_phase = True

    def after_both_discard_advance(self):
        # ドロー後に次ストリートのベッティング開始
        if self.hand_over:
            return
        self.street += 1
        if self.street > 3:
            # すでに最終ストリート後
            self.betting_open = False
            self.draw_phase = False
            return
        self._start_betting_round_after_draw()

    # APIからCPU進行を明示的に呼ぶための公開メソッド
    def cpu_auto_progress(self):
        self._cpu_auto_until_player_turn_or_round_end()

