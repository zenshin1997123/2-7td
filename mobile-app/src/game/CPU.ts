import { Hand } from './Hand';

/**
 * CPU戦略モード
 */
export type CPUMode = 
  | 'aggressive'    // アグレッシブ: 強い手で積極的にベット/レイズ
  | 'tight'         // タイト: 強い手のみプレイ
  | 'loose'         // ルース: 弱い手でもコール
  | 'bluff'         // ブラフ: ランダムにブラフ
  | 'conservative'; // 保守的: 弱い手はすぐフォールド

/**
 * CPU AIクラス
 */
export class CPU {
  public mode: CPUMode;

  constructor(mode?: CPUMode) {
    // モードが指定されていない場合はランダムに選択
    const modes: CPUMode[] = ['aggressive', 'tight', 'loose', 'bluff', 'conservative'];
    this.mode = mode || modes[Math.floor(Math.random() * modes.length)];
  }

  /**
   * ドローするカードを選択
   * @returns 残すカードのインデックス配列
   */
  selectDiscard(hand: Hand): number[] {
    const rank = hand.rankHand();
    
    // モードに応じた閾値設定
    let standPatThreshold = 8; // デフォルト
    
    switch (this.mode) {
      case 'aggressive':
        standPatThreshold = 9; // より積極的にスタンドパット
        break;
      case 'tight':
        standPatThreshold = 7; // 非常に強い手のみスタンドパット
        break;
      case 'loose':
        standPatThreshold = 10; // 弱い手でもスタンドパット
        break;
      case 'bluff':
        standPatThreshold = 8;
        break;
      case 'conservative':
        standPatThreshold = 7; // 強い手のみスタンドパット
        break;
    }
    
    // 強いハンドはスタンドパット
    if (rank.valid && rank.highCard <= standPatThreshold) {
      return [0, 1, 2, 3, 4]; // 全て残す
    }

    // シンプル: ペアやストレート・フラッシュ要素を捨てる志向
    const ranks = hand.cards.map(c => c[0]);
    const suits = hand.cards.map(c => c[1]);
    
    // ランクの出現回数をカウント
    const rankCounts = new Map<number, number>();
    for (const rank of ranks) {
      rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
    }

    // ペア優先で捨てる
    const remove: number[] = [];
    for (let i = 0; i < 5; i++) {
      const count = rankCounts.get(ranks[i]) || 0;
      if (count > 1) {
        remove.push(i);
      }
    }

    // ペアがない場合、A,K,Q,J,8,9,10を優先して捨てる
    if (remove.length === 0) {
      for (let i = 0; i < 5; i++) {
        if (ranks[i] > 7) {
          remove.push(i);
        }
      }
    }

    // 最低2枚は残すように
    const keep = [0, 1, 2, 3, 4].filter(i => !remove.includes(i));
    if (keep.length < 2) {
      // ランクが小さい順に2枚残す
      const sortedIndices = [...Array(5).keys()].sort((a, b) => ranks[a] - ranks[b]);
      return sortedIndices.slice(0, 2);
    }

    return keep;
  }

  /**
   * ベッティングアクションを選択
   */
  chooseAction(
    hand: Hand,
    facingBet: boolean,
    betSize: number,
    raisesThisRound: number,
    maxRaises: number,
    potSize: number = 0,
    callAmount: number = 0
  ): Action {
    const rank = hand.rankHand();
    const handStrength = rank.valid ? rank.highCard : 99;

    // ブラフモード: 10%の確率でランダムなアクション
    if (this.mode === 'bluff' && Math.random() < 0.1) {
      if (facingBet) {
        return Math.random() < 0.5 ? 'call' : 'fold';
      } else {
        return Math.random() < 0.3 ? 'bet' : 'check';
      }
    }

    if (facingBet) {
      // ベットにフェイスしている
      return this.chooseActionWhenFacingBet(
        handStrength,
        betSize,
        raisesThisRound,
        maxRaises,
        callAmount
      );
    } else {
      // ベットなし
      return this.chooseActionWhenNoBet(handStrength, raisesThisRound, maxRaises);
    }
  }

  /**
   * ベットにフェイスしている場合のアクション選択
   */
  private chooseActionWhenFacingBet(
    handStrength: number,
    betSize: number,
    raisesThisRound: number,
    maxRaises: number,
    callAmount: number
  ): 'fold' | 'call' | 'raise' {
    switch (this.mode) {
      case 'aggressive':
        // アグレッシブ: 強い手で積極的にレイズ、中程度でもコール
        if (handStrength <= 8) {
          return raisesThisRound < maxRaises ? 'raise' : 'call';
        } else if (handStrength <= 11) {
          return 'call';
        } else {
          // 弱い手でも小額ならコール
          return betSize === 4 ? 'fold' : 'call';
        }

      case 'tight':
        // タイト: 非常に強い手のみコール/レイズ
        if (handStrength <= 7) {
          return raisesThisRound < maxRaises ? 'raise' : 'call';
        } else if (handStrength <= 9) {
          return 'call';
        } else {
          return 'fold';
        }

      case 'loose':
        // ルース: 弱い手でもコール
        if (handStrength <= 10) {
          return 'call';
        } else if (handStrength <= 12) {
          // 非常に弱い手でも小額ならコール
          return betSize === 4 ? 'fold' : 'call';
        } else {
          return 'fold';
        }

      case 'bluff':
        // ブラフ: 中程度の手でもレイズすることがある
        if (handStrength <= 8) {
          return raisesThisRound < maxRaises ? 'raise' : 'call';
        } else if (handStrength <= 10 && Math.random() < 0.3) {
          // 30%の確率でブラフレイズ
          return raisesThisRound < maxRaises ? 'raise' : 'call';
        } else if (handStrength <= 11) {
          return 'call';
        } else {
          return betSize === 4 ? 'fold' : 'call';
        }

      case 'conservative':
        // 保守的: 強い手のみコール、弱い手はすぐフォールド
        if (handStrength <= 7) {
          return 'call';
        } else if (handStrength <= 9 && betSize === 2) {
          // スモールベットならコール
          return 'call';
        } else {
          return 'fold';
        }

      default:
        return 'call';
    }
  }

  /**
   * ベットなしの場合のアクション選択
   */
  private chooseActionWhenNoBet(
    handStrength: number,
    raisesThisRound: number,
    maxRaises: number
  ): 'check' | 'bet' {
    switch (this.mode) {
      case 'aggressive':
        // アグレッシブ: 中程度の手でもベット
        return handStrength <= 9 ? 'bet' : 'check';

      case 'tight':
        // タイト: 非常に強い手のみベット
        return handStrength <= 7 ? 'bet' : 'check';

      case 'loose':
        // ルース: 弱い手でもベットすることがある
        return handStrength <= 10 ? 'bet' : 'check';

      case 'bluff':
        // ブラフ: ランダムにベット
        if (handStrength <= 8) {
          return 'bet';
        } else if (handStrength <= 11 && Math.random() < 0.2) {
          // 20%の確率でブラフベット
          return 'bet';
        } else {
          return 'check';
        }

      case 'conservative':
        // 保守的: 強い手のみベット
        return handStrength <= 7 ? 'bet' : 'check';

      default:
        return handStrength <= 8 ? 'bet' : 'check';
    }
  }
}
