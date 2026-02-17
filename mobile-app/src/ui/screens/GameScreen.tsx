import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Game } from '../../game/Game';
import { Hand } from '../components/Hand';
import { ActionButton } from '../components/ActionButton';
import { Action, PlayerId } from '../../game/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 数値を安全に表示するヘルパー関数
const safeNumber = (value: number | undefined | null): number => {
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }
  return value;
};

// ゲームフェーズを取得
const getGamePhase = (street: number, drawPhase: boolean, bettingOpen: boolean, handOver: boolean): string => {
  if (handOver) return 'ゲーム終了';
  if (street === 0 && bettingOpen) return 'プリドローベッティング';
  if (drawPhase) {
    if (street === 1) return '第1ドロー';
    if (street === 2) return '第2ドロー';
    if (street === 3) return '第3ドロー';
    return 'ドロー';
  }
  if (bettingOpen) {
    if (street === 1) return '第1ストリート';
    if (street === 2) return '第2ストリート';
    if (street === 3) return '第3ストリート';
    return 'ベッティング';
  }
  if (street === 3) return 'ショーダウン待ち';
  return '進行中';
};

// プレイヤー位置の計算（円形配置）
// 0: あなた（下中央）、1-5: CPU（時計回りに配置）
const getPlayerPosition = (playerId: PlayerId) => {
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;
  const radius = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.3;
  
  // 位置マッピング（時計回り、下から開始）
  const positions: Record<PlayerId, { x: number; y: number }> = {
    0: { x: centerX, y: SCREEN_HEIGHT - 180 }, // あなた（下中央）
    1: { x: centerX + radius * 0.7, y: SCREEN_HEIGHT - 250 }, // 右下
    2: { x: centerX + radius * 0.9, y: centerY - 50 }, // 右
    3: { x: centerX, y: 80 }, // 上中央
    4: { x: centerX - radius * 0.9, y: centerY - 50 }, // 左
    5: { x: centerX - radius * 0.7, y: SCREEN_HEIGHT - 250 }, // 左下
  };
  
  return positions[playerId] || { x: centerX, y: centerY };
};

export const GameScreen: React.FC = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);

  useEffect(() => {
    startNewGame();
  }, []);

  // ゲーム状態の変更を監視してUIを更新（CPUのターンを自動処理）
  useEffect(() => {
    if (!game) return;
    
    const state = game.getState();
    
    // CPUのターンの場合、自動的に進行させる
    if (state.bettingOpen && !state.handOver && state.toAct !== null && state.toAct !== 0) {
      const timer = setTimeout(() => {
        try {
          game.cpuAutoProgress();
          setUpdateCounter(prev => prev + 1);
        } catch (error) {
          console.error('CPU auto progress error:', error);
          setUpdateCounter(prev => prev + 1);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [game, updateCounter]);

  const startNewGame = () => {
    const newGame = new Game(100);
    setGame(newGame);
    setSelectedCards([]);
    setUpdateCounter(0);
  };

  const handleAction = (action: Action) => {
    if (!game) return;

    try {
      const state = game.getState();
      if (!state.bettingOpen) {
        Alert.alert('エラー', 'ベッティングラウンドが開始されていません');
        return;
      }
      
      if (state.toAct !== 0) {
        Alert.alert('エラー', 'あなたのターンではありません');
        return;
      }

      const player = state.players[0];
      if (player.isFolded || player.isAllIn) {
        Alert.alert('エラー', 'アクションできません');
        return;
      }

      // アクションを実行
      game.playerAction(action);
      
      // 状態を強制的に更新
      setUpdateCounter(prev => prev + 1);

      // 状態を再取得して確認
      setTimeout(() => {
        const newState = game.getState();
        if (newState.handOver && newState.lastPayout) {
          const payout = newState.lastPayout;
          const isWinner = payout.winners.includes(0);
          if (payout.winners.length === 1 && isWinner) {
            Alert.alert('結果', `あなたが${payout.amounts[0]}チップ獲得しました！`);
          } else if (payout.winners.length > 1 && isWinner) {
            Alert.alert('結果', `スプリット: あなたが${payout.amounts[payout.winners.indexOf(0)]}チップ獲得しました`);
          }
        }
        // 再度更新してUIを反映
        setUpdateCounter(prev => prev + 1);
      }, 200);
    } catch (error) {
      console.error('Action error:', error);
      Alert.alert('エラー', 'アクションの実行中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCardPress = (index: number) => {
    if (!game) return;
    const state = game.getState();
    if (!state.drawPhase) return;

    if (selectedCards.includes(index)) {
      setSelectedCards(selectedCards.filter(i => i !== index));
    } else {
      if (selectedCards.length < 5) {
        setSelectedCards([...selectedCards, index]);
      }
    }
  };

  const handleDraw = () => {
    if (!game) return;
    
    try {
      const state = game.getState();
      if (!state.drawPhase) return;

      const keepIndexes = [0, 1, 2, 3, 4].filter(
        i => !selectedCards.includes(i)
      );

      game.playerDiscard(keepIndexes);
      game.cpuDiscard();
      game.afterAllDiscardAdvance();

      setUpdateCounter(prev => prev + 1);
      setSelectedCards([]);
    } catch (error) {
      console.error('Draw error:', error);
      Alert.alert('エラー', 'カード交換中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleStandPat = () => {
    if (!game) return;
    
    try {
      const state = game.getState();
      if (!state.drawPhase) return;

      game.playerDiscard([0, 1, 2, 3, 4]);
      game.cpuDiscard();
      game.afterAllDiscardAdvance();

      setUpdateCounter(prev => prev + 1);
      setSelectedCards([]);
    } catch (error) {
      console.error('Stand pat error:', error);
      Alert.alert('エラー', 'スタンドパット中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleShowdown = () => {
    if (!game) return;
    
    try {
      const state = game.getState();
      if (state.street !== 3 || state.bettingOpen || state.drawPhase) return;

      const result = game.showdown();
      setUpdateCounter(prev => prev + 1);

      const isWinner = result.winners.includes(0);
      if (isWinner) {
        const payout = result.payouts.find(p => p.playerId === 0);
        Alert.alert('ショーダウン', `あなたの勝ち！${payout?.amount || 0}チップ獲得`);
      } else {
        Alert.alert('ショーダウン', 'あなたの負け...');
      }
    } catch (error) {
      console.error('Showdown error:', error);
      Alert.alert('エラー', 'ショーダウン中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>ゲームを開始しています...</Text>
      </View>
    );
  }

  let state;
  try {
    state = game.getState();
  } catch (error) {
    console.error('Get state error:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>エラーが発生しました。新しいゲームを開始してください。</Text>
        <TouchableOpacity style={styles.newGameButton} onPress={startNewGame}>
          <Text style={styles.newGameText}>新しいゲーム</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const myTurn = state.bettingOpen && state.toAct === 0;
  const gamePhase = getGamePhase(state.street, state.drawPhase, state.bettingOpen, state.handOver);
  const callAmount = Math.max(0, state.currentBet - state.players[0].contrib);
  const betSize = state.street <= 1 ? 2 : 4;

  // 勝敗判定
  let winnerDisplay: PlayerId[] | null = null;
  if (state.handOver && state.lastPayout) {
    winnerDisplay = state.lastPayout.winners;
  }

  // プレイヤーのハンドを取得
  const playerHand = game.getPlayerHand(0);

  // プレイヤー配置（0: あなた、1-5: CPU）
  const playerPositions = [
    { id: 0, name: 'あなた', isPlayer: true }, // 下中央
    { id: 1, name: 'CPU1', isPlayer: false },   // 右下
    { id: 2, name: 'CPU2', isPlayer: false },   // 右上
    { id: 3, name: 'CPU3', isPlayer: false },   // 上中央
    { id: 4, name: 'CPU4', isPlayer: false },   // 左上
    { id: 5, name: 'CPU5', isPlayer: false },   // 左下
  ];

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>2-7 Triple Draw Poker</Text>
        <TouchableOpacity style={styles.newGameButton} onPress={startNewGame}>
          <Text style={styles.newGameText}>新しいゲーム</Text>
        </TouchableOpacity>
      </View>

      {/* 勝敗結果バナー */}
      {winnerDisplay && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerBannerText}>
            {winnerDisplay.includes(0) 
              ? `🎉 あなたの勝ち！${state.lastPayout?.amounts[winnerDisplay.indexOf(0)] || 0}チップ獲得`
              : '😢 あなたの負け...'}
          </Text>
        </View>
      )}

      {/* テーブルエリア */}
      <View style={styles.tableArea}>
        {/* 中央のポット表示 */}
        <View style={styles.centerArea}>
          <View style={styles.potDisplay}>
            <Text style={styles.potLabel}>ポット</Text>
            <Text style={styles.potAmount}>{safeNumber(state.pot)}</Text>
          </View>
          
          {/* フェーズ表示 */}
          <View style={styles.phaseBanner}>
            <Text style={styles.phaseText}>{gamePhase}</Text>
          </View>

          {/* ベット情報 */}
          {state.bettingOpen && !state.handOver && (
            <View style={styles.betInfoCompact}>
              <Text style={styles.betInfoText}>
                ベット: {safeNumber(state.currentBet)} | 
                {callAmount > 0 ? ` コール: ${callAmount}` : ' チェック可能'} | 
                サイズ: {betSize}
              </Text>
            </View>
          )}
        </View>

        {/* CPUプレイヤー（上、左上、右上、左下、右下） */}
        {playerPositions.slice(1).map((pos) => {
          const player = state.players[pos.id];
          const cpuHand = game.getPlayerHand(pos.id);
          const isActive = state.toAct === pos.id;
          const showHand = state.handOver || winnerDisplay?.includes(pos.id);
          const lastAction = state.lastAction?.playerId === pos.id ? state.lastAction.action : null;
          const position = getPlayerPosition(pos.id);

          return (
            <View
              key={pos.id}
              style={[
                styles.playerSeat,
                {
                  left: position.x - 60,
                  top: position.y - 40,
                },
                isActive && styles.activeSeat,
              ]}
            >
              <View style={styles.playerSeatContent}>
                <Text style={styles.playerSeatName}>{player.name}</Text>
                <Text style={styles.playerSeatStack}>${safeNumber(player.stack)}</Text>
                {player.isFolded && <Text style={styles.foldedText}>フォールド</Text>}
                {lastAction && (
                  <Text style={styles.actionBadge}>
                    {lastAction === 'fold' ? 'F' :
                     lastAction === 'check' ? 'C' :
                     lastAction === 'call' ? 'C' :
                     lastAction === 'bet' ? 'B' :
                     lastAction === 'raise' ? 'R' : ''}
                  </Text>
                )}
                {cpuHand && (
                  <View style={styles.playerSeatHand}>
                    <Hand
                      cards={player.hand}
                      faceDown={!showHand}
                    />
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* プレイヤーエリア（下中央） */}
        <View style={styles.playerArea}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>あなた</Text>
            <Text style={styles.stackText}>スタック: ${safeNumber(state.players[0].stack)}</Text>
            {state.toAct === 0 && state.bettingOpen && (
              <Text style={styles.yourTurnText}>あなたのターン</Text>
            )}
          </View>
          {playerHand && (
            <View style={styles.playerHandContainer}>
              <Hand
                cards={state.players[0].hand}
                selected={selectedCards}
                onCardPress={handleCardPress}
              />
            </View>
          )}
          {state.drawPhase && (
            <Text style={styles.drawHint}>
              {selectedCards.length === 0 ? '交換するカードを選択' : `${selectedCards.length}枚交換`}
            </Text>
          )}
        </View>
      </View>

      {/* アクションボタン */}
      <View style={styles.controlsContainer}>
        {state.drawPhase ? (
          <View style={styles.controls}>
            <ActionButton
              action="bet"
              label="カード交換"
              onPress={handleDraw}
              variant="info"
              disabled={selectedCards.length === 5}
            />
            <ActionButton
              action="bet"
              label="スタンドパット"
              onPress={handleStandPat}
              variant="success"
            />
          </View>
        ) : (
          <View style={styles.controls}>
            {state.legalActions.includes('fold') && (
              <ActionButton
                action="fold"
                label="フォールド"
                onPress={() => handleAction('fold')}
                variant="danger"
                disabled={!myTurn}
              />
            )}
            {(state.legalActions.includes('check') || state.legalActions.includes('call')) && (
              <ActionButton
                action={state.legalActions.includes('check') ? 'check' : 'call'}
                label={state.legalActions.includes('check') ? 'チェック' : `コール(${callAmount})`}
                onPress={() => handleAction(state.legalActions.includes('check') ? 'check' : 'call')}
                variant="success"
                disabled={!myTurn}
              />
            )}
            {(state.legalActions.includes('bet') || state.legalActions.includes('raise')) && (
              <ActionButton
                action={state.legalActions.includes('bet') ? 'bet' : 'raise'}
                label={state.legalActions.includes('bet') ? `ベット(${betSize})` : `レイズ(${betSize})`}
                onPress={() => handleAction(state.legalActions.includes('bet') ? 'bet' : 'raise')}
                variant="warning"
                disabled={!myTurn}
              />
            )}
            {state.street === 3 && !state.bettingOpen && !state.drawPhase && !state.handOver && (
              <ActionButton
                action="bet"
                label="ショーダウン"
                onPress={handleShowdown}
                variant="primary"
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4c3a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  newGameButton: {
    backgroundColor: '#ffd700',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  newGameText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  winnerBanner: {
    backgroundColor: 'rgba(56, 239, 125, 0.8)',
    padding: 8,
    alignItems: 'center',
  },
  winnerBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  tableArea: {
    flex: 1,
    position: 'relative',
  },
  centerArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -80 }, { translateY: -60 }],
    alignItems: 'center',
    width: 160,
  },
  potDisplay: {
    backgroundColor: '#ffd700',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    minWidth: 120,
  },
  potLabel: {
    fontSize: 12,
    color: '#000',
    marginBottom: 4,
  },
  potAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  phaseBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#4ecdc4',
    minWidth: 120,
  },
  phaseText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4ecdc4',
    textAlign: 'center',
  },
  betInfoCompact: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    padding: 6,
    borderRadius: 8,
    minWidth: 120,
  },
  betInfoText: {
    fontSize: 10,
    color: '#ffd700',
    textAlign: 'center',
    fontWeight: '600',
  },
  playerSeat: {
    position: 'absolute',
    width: 120,
    alignItems: 'center',
  },
  activeSeat: {
    borderWidth: 2,
    borderColor: '#4ecdc4',
    borderRadius: 8,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
  },
  playerSeatContent: {
    alignItems: 'center',
  },
  playerSeatName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  playerSeatStack: {
    fontSize: 10,
    color: '#ccc',
    marginBottom: 2,
  },
  foldedText: {
    fontSize: 10,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  actionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 2,
    borderRadius: 4,
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
    minWidth: 20,
    textAlign: 'center',
  },
  playerSeatHand: {
    marginTop: 4,
  },
  playerArea: {
    position: 'absolute',
    bottom: 80,
    left: '50%',
    transform: [{ translateX: -150 }],
    width: 300,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  playerInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 4,
  },
  stackText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  yourTurnText: {
    fontSize: 12,
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  playerHandContainer: {
    marginBottom: 8,
  },
  drawHint: {
    fontSize: 12,
    color: '#4ecdc4',
    textAlign: 'center',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
    padding: 20,
  },
});
