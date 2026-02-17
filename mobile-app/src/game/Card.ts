import { Card as CardType, Rank, Suit } from './types';

const CARD_RANK_MAP: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

/**
 * カードを文字列に変換
 */
export function cardToString(card: CardType): string {
  const [rank, suit] = card;
  const rankStr = CARD_RANK_MAP[rank] || rank.toString();
  return `${rankStr}${suit}`;
}

/**
 * カードのランクを取得（表示用）
 */
export function getRankString(rank: Rank): string {
  return CARD_RANK_MAP[rank] || rank.toString();
}

/**
 * カードのスートを取得
 */
export function getSuitString(suit: Suit): string {
  const suitMap: Record<Suit, string> = {
    S: '♠',
    H: '♥',
    D: '♦',
    C: '♣',
  };
  return suitMap[suit];
}

/**
 * カードの色を取得（表示用）
 */
export function getCardColor(suit: Suit): 'red' | 'black' {
  return suit === 'H' || suit === 'D' ? 'red' : 'black';
}
