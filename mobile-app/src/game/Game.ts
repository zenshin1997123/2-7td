import { Deck } from './Deck';
import { Hand } from './Hand';
import { CPU, CPUMode } from './CPU';
import { Action, GameState, Payout, ShowdownResult, PlayerId, PlayerInfo } from './types';

/**
 * 5人プレイ対応のゲームクラス
 */
export class Game {
  private deck: Deck;
  private players: PlayerInfo[]; // 0: プレイヤー, 1-4: CPU
  private hands: Map<PlayerId, Hand>; // 各プレイヤーのハンド
  private cpuAgents: Map<PlayerId, CPU>; // CPUエージェント（1-4のみ）

  public pot: number;

  // ベッティング設定
  private smallBlind: number = 1;
  private bigBlind: number = 2;
  private limitSmallBet: number = 2;
  private limitBigBet: number = 4;
  private maxRaises: number = 3;

  // ゲーム進行
  public street: number = 0; // 0: プリドロー, 1-3: ドロー後
  public turn: number = 0; // ドロー回数（0-2）
  public dealerPosition: number = 0; // ディーラーポジション（0-4）

  // ベッティング状態
  public currentBet: number = 0;
  public raisesThisRound: number = 0;
  public toAct: PlayerId | null = 0; // 現在のアクター
  public bettingOpen: boolean = true;
  public drawPhase: boolean = false;
  public handOver: boolean = false;
  public checkPending: Set<PlayerId> = new Set();

  // その他
  public lastAction: { playerId: PlayerId; action: Action } | null = null;
  public lastPayout: Payout | null = null;

  constructor(initialStack: number = 100) {
    this.pot = 0;
    this.deck = new Deck();
    this.hands = new Map();
    this.cpuAgents = new Map();

    // プレイヤー初期化（0: プレイヤー, 1-5: CPU）
    this.players = [
      { id: 0, name: 'あなた', stack: initialStack, contrib: 0, isFolded: false, isAllIn: false, hand: [] },
      { id: 1, name: 'CPU1', stack: initialStack, contrib: 0, isFolded: false, isAllIn: false, hand: [], cpuMode: this.getRandomMode() },
      { id: 2, name: 'CPU2', stack: initialStack, contrib: 0, isFolded: false, isAllIn: false, hand: [], cpuMode: this.getRandomMode() },
      { id: 3, name: 'CPU3', stack: initialStack, contrib: 0, isFolded: false, isAllIn: false, hand: [], cpuMode: this.getRandomMode() },
      { id: 4, name: 'CPU4', stack: initialStack, contrib: 0, isFolded: false, isAllIn: false, hand: [], cpuMode: this.getRandomMode() },
      { id: 5, name: 'CPU5', stack: initialStack, contrib: 0, isFolded: false, isAllIn: false, hand: [], cpuMode: this.getRandomMode() },
    ];

    // CPUエージェント初期化
    for (let i = 1; i <= 5; i++) {
      const mode = this.players[i].cpuMode as CPUMode;
      this.cpuAgents.set(i as PlayerId, new CPU(mode));
    }

    // カードを配る
    for (const player of this.players) {
      const hand = new Hand(this.deck.draw(5));
      this.hands.set(player.id, hand);
      player.hand = [...hand.cards];
    }

    // ブラインドをポストしてプリドローベッティングへ
    this.postBlindsStartRound();
  }

  /**
   * ランダムなCPUモードを取得
   */
  private getRandomMode(): CPUMode {
    const modes: CPUMode[] = ['aggressive', 'tight', 'loose', 'bluff', 'conservative'];
    return modes[Math.floor(Math.random() * modes.length)];
  }

  /**
   * ベットサイズを取得
   */
  private betSize(): number {
    return this.street <= 1 ? this.limitSmallBet : this.limitBigBet;
  }

  /**
   * 次のアクティブプレイヤーを取得（フォールドしていない）
   */
  private getNextActivePlayer(from: PlayerId): PlayerId | null {
    let current = (from + 1) % 6;
    let checked = 0;
    
    while (checked < 6) {
      const player = this.players[current];
      if (!player.isFolded && !player.isAllIn) {
        return current as PlayerId;
      }
      current = (current + 1) % 6;
      checked++;
    }
    return null;
  }

  /**
   * アクティブなプレイヤー数を取得
   */
  private getActivePlayerCount(): number {
    return this.players.filter(p => !p.isFolded && !p.isAllIn).length;
  }

  /**
   * ブラインドをポストしてラウンド開始
   */
  private postBlindsStartRound(): void {
    // 6人プレイ: SB, BB, UTG, MP, CO, BTN
    // ディーラーの左がSB、その左がBB
    const sbPos = (this.dealerPosition + 1) % 6;
    const bbPos = (this.dealerPosition + 2) % 6;

    this.players[sbPos].stack -= this.smallBlind;
    this.players[sbPos].contrib = this.smallBlind;
    this.players[bbPos].stack -= this.bigBlind;
    this.players[bbPos].contrib = this.bigBlind;
    
    this.pot += this.smallBlind + this.bigBlind;
    this.currentBet = this.bigBlind;
    this.raisesThisRound = 0;
    
    // プリドローはBBの左（UTG）が先行
    this.toAct = (this.dealerPosition + 3) % 6 as PlayerId;
    this.bettingOpen = true;
    this.drawPhase = false;
    this.checkPending.clear();
  }

  /**
   * ラウンドのコントリビューションをリセット
   */
  private resetRoundContrib(): void {
    this.currentBet = 0;
    this.raisesThisRound = 0;
    this.checkPending.clear();
    for (const player of this.players) {
      player.contrib = 0;
    }
  }

  /**
   * ドロー後のベッティングラウンド開始
   */
  private startBettingRoundAfterDraw(): void {
    // ドローのあとはボタンの左（SB）が先行
    this.bettingOpen = true;
    this.drawPhase = false;
    this.resetRoundContrib();
    this.toAct = (this.dealerPosition + 1) % 6 as PlayerId;
    this.lastAction = null;
  }

  /**
   * プレイヤーの合法アクションを取得
   */
  legalActionsForPlayer(): Action[] {
    if (!this.bettingOpen || this.handOver || this.toAct !== 0) {
      return [];
    }
    
    const player = this.players[0];
    if (player.isFolded || player.isAllIn) {
      return [];
    }

    if (this.currentBet > player.contrib) {
      const actions: Action[] = ['fold', 'call'];
      if (this.raisesThisRound < this.maxRaises) {
        actions.push('raise');
      }
      return actions;
    } else {
      return ['check', 'bet'];
    }
  }

  /**
   * ベットを適用
   */
  private applyBet(playerId: PlayerId, amount: number): void {
    const player = this.players[playerId];
    const actualAmount = Math.min(amount, player.stack);
    player.stack -= actualAmount;
    player.contrib += actualAmount;
    this.pot += actualAmount;
    
    if (player.stack === 0) {
      player.isAllIn = true;
    }
    
    // ベットが入ればチェック状態はリセット
    this.checkPending.clear();
  }

  /**
   * 現在のベットにコール
   */
  private callToCurrent(playerId: PlayerId): void {
    const player = this.players[playerId];
    const need = Math.min(this.currentBet - player.contrib, player.stack);
    this.applyBet(playerId, need);
  }

  /**
   * ベットまたはレイズ
   */
  private betOrRaise(playerId: PlayerId): void {
    const size = this.betSize();
    if (this.currentBet === 0) {
      // ベット
      this.currentBet = size;
      this.applyBet(playerId, size);
    } else {
      // レイズ
      this.currentBet += size;
      this.raisesThisRound += 1;
      const player = this.players[playerId];
      const need = Math.min(this.currentBet - player.contrib, player.stack);
      this.applyBet(playerId, need);
    }
  }

  /**
   * ラウンド終了判定
   */
  private roundMaybeClose(): boolean {
    // 全アクティブプレイヤーのコントリビューションが一致し、かつ誰も未行動でなければ終了
    const activePlayers = this.players.filter(p => !p.isFolded && !p.isAllIn);
    if (activePlayers.length === 0) return true;
    
    const targetContrib = Math.max(...activePlayers.map(p => p.contrib));
    const allMatched = activePlayers.every(p => p.contrib === targetContrib || p.isAllIn);
    
    if (allMatched && this.toAct === null) {
      this.bettingOpen = false;
      this.drawPhase = this.street < 3;
      this.checkPending.clear();
      return true;
    }
    return false;
  }

  /**
   * 次のアクターに進む
   */
  private advanceToNextActor(): void {
    if (this.toAct === null) return;
    
    const next = this.getNextActivePlayer(this.toAct);
    if (next === null || next === this.toAct) {
      // 次のアクティブプレイヤーがいない、または1人だけ
      this.toAct = null;
      this.roundMaybeClose();
    } else {
      this.toAct = next;
    }
  }

  /**
   * プレイヤーのアクション
   */
  playerAction(action: Action): void {
    if (this.handOver || !this.bettingOpen || this.toAct !== 0) {
      return;
    }

    const player = this.players[0];
    if (player.isFolded || player.isAllIn) {
      return;
    }

    this.lastAction = { playerId: 0, action };

    if (action === 'fold') {
      player.isFolded = true;
      this.advanceToNextActor();
      
      // 1人だけ残ったら勝ち
      if (this.getActivePlayerCount() === 1) {
        this.endHandWithFoldWin();
        return;
      }
    } else if (this.currentBet > player.contrib) {
      // フェイスしている
      if (action === 'call') {
        this.callToCurrent(0);
        this.advanceToNextActor();
      } else if (action === 'raise' && this.raisesThisRound < this.maxRaises) {
        this.betOrRaise(0);
        this.advanceToNextActor();
      } else {
        return;
      }
    } else {
      // ベットなし
      if (action === 'check') {
        this.checkPending.add(0);
        this.advanceToNextActor();
      } else if (action === 'bet') {
        this.betOrRaise(0);
        this.advanceToNextActor();
      } else {
        return;
      }
    }

    // CPUの自動進行
    this.processCPUActions();
  }

  /**
   * CPUのアクションを処理
   */
  private processCPUActions(): void {
    while (this.bettingOpen && !this.handOver && this.toAct !== null && this.toAct !== 0) {
      const cpuId = this.toAct;
      const cpu = this.cpuAgents.get(cpuId);
      const player = this.players[cpuId];
      
      if (!cpu || player.isFolded || player.isAllIn) {
        this.advanceToNextActor();
        continue;
      }

      const hand = this.hands.get(cpuId)!;
      const facingBet = this.currentBet > player.contrib;
      const size = this.betSize();
      const callAmount = Math.max(0, this.currentBet - player.contrib);

      const action = cpu.chooseAction(
        hand,
        facingBet,
        size,
        this.raisesThisRound,
        this.maxRaises,
        this.pot,
        callAmount
      );

      this.lastAction = { playerId: cpuId, action };

      if (action === 'fold') {
        player.isFolded = true;
        this.advanceToNextActor();
        
        // 1人だけ残ったら勝ち
        if (this.getActivePlayerCount() === 1) {
          this.endHandWithFoldWin();
          return;
        }
      } else if (this.currentBet > player.contrib) {
        if (action === 'call') {
          this.callToCurrent(cpuId);
          this.advanceToNextActor();
        } else if (action === 'raise' && this.raisesThisRound < this.maxRaises) {
          this.betOrRaise(cpuId);
          this.advanceToNextActor();
        } else {
          // フォールバック: コール
          this.callToCurrent(cpuId);
          this.advanceToNextActor();
        }
      } else {
        if (action === 'bet') {
          this.betOrRaise(cpuId);
          this.advanceToNextActor();
        } else {
          // check処理
          this.checkPending.add(cpuId);
          this.advanceToNextActor();
        }
      }

      if (this.roundMaybeClose()) {
        break;
      }
    }

    // ラウンド終了処理
    if (!this.bettingOpen && this.street < 3 && !this.handOver) {
      this.drawPhase = true;
    }
  }

  /**
   * フォールド勝ちでハンド終了
   */
  private endHandWithFoldWin(): void {
    const winner = this.players.find(p => !p.isFolded);
    if (winner) {
      winner.stack += this.pot;
      this.lastPayout = {
        type: 'fold',
        winners: [winner.id],
        amounts: [this.pot],
      };
      this.pot = 0;
      this.handOver = true;
      this.bettingOpen = false;
    }
  }

  /**
   * CPU進行を明示的に呼ぶ（公開メソッド）
   */
  cpuAutoProgress(): void {
    this.processCPUActions();
  }

  /**
   * プレイヤーのドロー
   */
  playerDiscard(keepIndexes: number[]): void {
    const hand = this.hands.get(0)!;
    hand.discardAndDraw(keepIndexes, this.deck);
    this.players[0].hand = [...hand.cards];
    this.turn += 1;
  }

  /**
   * CPUのドロー
   */
  cpuDiscard(): void {
    for (let i = 1; i <= 5; i++) {
      const cpuId = i as PlayerId;
      const cpu = this.cpuAgents.get(cpuId);
      const hand = this.hands.get(cpuId);
      const player = this.players[cpuId];
      
      if (cpu && hand && !player.isFolded) {
        const keepIndexes = cpu.selectDiscard(hand);
        hand.discardAndDraw(keepIndexes, this.deck);
        player.hand = [...hand.cards];
      }
    }
  }

  /**
   * 全員ドロー後の進行
   */
  afterAllDiscardAdvance(): void {
    if (this.handOver) {
      return;
    }
    this.street += 1;
    if (this.street > 3) {
      this.bettingOpen = false;
      this.drawPhase = false;
      return;
    }
    this.startBettingRoundAfterDraw();
    
    // CPUのターンなら自動進行
    if (this.toAct !== null && this.toAct !== 0 && this.bettingOpen && !this.handOver) {
      this.processCPUActions();
    }
  }

  /**
   * ショーダウン
   */
  showdown(): ShowdownResult {
    const activePlayers = this.players.filter(p => !p.isFolded);
    
    if (activePlayers.length === 0) {
      return { winners: [], playerHands: [], payouts: [] };
    }

    if (activePlayers.length === 1) {
      // 1人だけ残っている場合
      const winner = activePlayers[0];
      winner.stack += this.pot;
      const payout = this.pot;
      this.pot = 0;
      this.handOver = true;
      this.lastPayout = {
        type: 'showdown',
        winners: [winner.id],
        amounts: [payout],
      };
      return {
        winners: [winner.id],
        playerHands: [{ playerId: winner.id, cards: winner.hand }],
        payouts: [{ playerId: winner.id, amount: payout }],
      };
    }

    // 複数人でハンドを比較
    const handRanks = activePlayers.map(player => {
      const hand = this.hands.get(player.id)!;
      const rank = hand.rankHand();
      return { player, hand, rank };
    });

    // 最強のハンドを探す
    let winners = [handRanks[0].player];
    let bestHand = handRanks[0].hand;

    for (let i = 1; i < handRanks.length; i++) {
      const comparison = bestHand.compareTo(handRanks[i].hand);
      if (comparison < 0) {
        // handRanks[i]が強い
        bestHand = handRanks[i].hand;
        winners = [handRanks[i].player];
      } else if (comparison === 0) {
        // 引き分け
        winners.push(handRanks[i].player);
      }
    }

    // ポットを分配
    const payoutPerWinner = Math.floor(this.pot / winners.length);
    const remainder = this.pot % winners.length;
    
    const payouts = winners.map((winner, index) => {
      const amount = payoutPerWinner + (index < remainder ? 1 : 0);
      winner.stack += amount;
      return { playerId: winner.id, amount };
    });

    this.lastPayout = {
      type: winners.length > 1 ? 'split' : 'showdown',
      winners: winners.map(w => w.id),
      amounts: payouts.map(p => p.amount),
    };

    this.pot = 0;
    this.handOver = true;

    return {
      winners: winners.map(w => w.id),
      playerHands: activePlayers.map(p => ({ playerId: p.id, cards: p.hand })),
      payouts,
    };
  }

  /**
   * ゲーム状態を取得
   */
  getState(): GameState {
    return {
      pot: this.pot,
      players: this.players.map(p => ({
        ...p,
        hand: p.isFolded ? [] : [...p.hand], // フォールドしたプレイヤーのハンドは非表示
      })),
      street: this.street,
      turnDraw: this.turn,
      toAct: this.toAct,
      bettingOpen: this.bettingOpen,
      drawPhase: this.drawPhase,
      handOver: this.handOver,
      currentBet: this.currentBet,
      raisesThisRound: this.raisesThisRound,
      dealerPosition: this.dealerPosition,
      legalActions: this.legalActionsForPlayer(),
      lastAction: this.lastAction,
      lastPayout: this.lastPayout,
    };
  }

  /**
   * プレイヤーのハンドを取得（公開用）
   */
  getPlayerHand(playerId: PlayerId): Hand | null {
    return this.hands.get(playerId) || null;
  }
}
