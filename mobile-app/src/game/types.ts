// カードの型定義
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type Card = [Rank, Suit];

// アクションの型
export type Action = 'fold' | 'check' | 'call' | 'bet' | 'raise';

// ハンド評価結果
export interface HandRank {
  valid: boolean;
  highCard: number;
  ranks: number[]; // 降順でソート（比較用）
}

// プレイヤーID（0: プレイヤー, 1-5: CPU）
export type PlayerId = 0 | 1 | 2 | 3 | 4 | 5;

// プレイヤー情報
export interface PlayerInfo {
  id: PlayerId;
  name: string;
  stack: number;
  contrib: number;
  isFolded: boolean;
  isAllIn: boolean;
  hand: Card[];
  cpuMode?: string; // CPUの場合のモード
}

// ゲーム状態
export interface GameState {
  pot: number;
  players: PlayerInfo[];
  street: number; // 0: プリドロー, 1-3: ドロー後
  turnDraw: number; // 0-2: ドロー回数
  toAct: PlayerId | null; // 現在のアクター
  bettingOpen: boolean;
  drawPhase: boolean;
  handOver: boolean;
  currentBet: number;
  raisesThisRound: number;
  dealerPosition: number; // ディーラーポジション（0-5）
  legalActions: Action[];
  lastAction: { playerId: PlayerId; action: Action } | null;
  lastPayout: Payout | null;
}

// 配当情報
export interface Payout {
  type: 'fold' | 'showdown' | 'split';
  winners: PlayerId[]; // 複数の勝者がいる場合
  amounts: number[]; // 各勝者の獲得額
}

// ショーダウン結果
export interface ShowdownResult {
  winners: PlayerId[];
  playerHands: { playerId: PlayerId; cards: Card[] }[];
  payouts: { playerId: PlayerId; amount: number }[];
}
