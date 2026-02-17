import { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/**
 * デッキクラス
 */
export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = [];
    this.reset();
    this.shuffle();
  }

  /**
   * デッキをリセット（52枚のカードを作成）
   */
  reset(): void {
    this.cards = [];
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        this.cards.push([rank, suit]);
      }
    }
  }

  /**
   * デッキをシャッフル
   */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * カードを引く
   */
  draw(n: number): Card[] {
    if (n > this.cards.length) {
      throw new Error(`Not enough cards in deck. Requested: ${n}, Available: ${this.cards.length}`);
    }
    return this.cards.splice(0, n);
  }

  /**
   * 残りのカード数
   */
  get remaining(): number {
    return this.cards.length;
  }
}
