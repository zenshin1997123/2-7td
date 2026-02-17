import { Card } from './types';
import { HandRank } from './types';
import { Deck } from './Deck';

/**
 * ハンドクラス
 */
export class Hand {
  public cards: Card[];

  constructor(cards: Card[]) {
    if (cards.length !== 5) {
      throw new Error('Hand must contain exactly 5 cards');
    }
    this.cards = [...cards];
  }

  /**
   * カードを捨てて新しいカードを引く
   */
  discardAndDraw(keepIndexes: number[], deck: Deck): void {
    const keptCards = keepIndexes.map(i => this.cards[i]);
    const numDiscards = 5 - keptCards.length;
    const newCards = deck.draw(numDiscards);
    this.cards = [...keptCards, ...newCards];
  }

  /**
   * ストレート判定（Aロー含む）
   */
  private isStraight(ranks: number[]): boolean {
    // 通常のストレート
    if (ranks[0] + 4 === ranks[4] && ranks[1] === ranks[0] + 1 && 
        ranks[2] === ranks[0] + 2 && ranks[3] === ranks[0] + 3) {
      return true;
    }
    // Aローストレート (A-2-3-4-5)
    if (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && 
        ranks[3] === 5 && ranks[4] === 14) {
      return true;
    }
    return false;
  }

  /**
   * ハンドを評価（2-7ロウ判定）
   */
  rankHand(): HandRank {
    const ranks = this.cards.map(c => c[0]).sort((a, b) => a - b);
    const suits = this.cards.map(c => c[1]);

    // ペア・トリップ・フォーカードチェック
    const rankCounts = new Map<number, number>();
    for (const rank of ranks) {
      rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
    }
    const hasPair = Math.max(...Array.from(rankCounts.values())) > 1;

    // フラッシュチェック
    const isFlush = new Set(suits).size === 1;

    // ストレートチェック
    const isStraight = this.isStraight(ranks);

    // 無効ハンド（ストレート、フラッシュ、ペア以上）
    if (hasPair || isFlush || isStraight) {
      return {
        valid: false,
        highCard: 14, // 最弱扱い
        ranks: ranks.reverse(), // 降順
      };
    }

    // 有効なロウハンド
    // ハイカードから順に比較（小さい方が強い）
    return {
      valid: true,
      highCard: ranks[4], // 最大値
      ranks: ranks.reverse(), // 降順で比較用
    };
  }

  /**
   * ハンドを比較
   * @returns 1: thisが強い, -1: otherが強い, 0: 引き分け
   */
  compareTo(other: Hand): number {
    const thisRank = this.rankHand();
    const otherRank = other.rankHand();

    // 無効ハンド同士は引き分け
    if (!thisRank.valid && !otherRank.valid) {
      return 0;
    }

    // 無効ハンドは最弱
    if (!thisRank.valid) return -1;
    if (!otherRank.valid) return 1;

    // 有効ハンド同士の比較（ハイカードから順に、小さい方が強い）
    for (let i = 0; i < 5; i++) {
      if (thisRank.ranks[i] < otherRank.ranks[i]) {
        return 1; // thisが強い
      } else if (thisRank.ranks[i] > otherRank.ranks[i]) {
        return -1; // otherが強い
      }
    }
    return 0; // 引き分け
  }
}
