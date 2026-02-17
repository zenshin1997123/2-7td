import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Game } from '../../game/Game';
import { Hand } from '../components/Hand';
import { ActionButton } from '../components/ActionButton';
import { Action, PlayerId } from '../../game/types';

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

// CPUモードの日本語名
const getModeName = (mode?: string): string => {
  const modeMap: Record<string, string> = {
    aggressive: 'アグレッシブ',
    tight: 'タイト',
    loose: 'ルース',
    bluff: 'ブラフ',
    conservative: '保守的',
  };
  return mode ? modeMap[mode] || mode : '';
};

export const GameScreen: React.FC = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    const newGame = new Game(100);
    setGame(newGame);
    setSelectedCards([]);
    setUpdateCounter(0);
  };

  const handleAction = (action: Action) => {
    if (!game) return;

    try {
      game.playerAction(action);
      setUpdateCounter(prev => prev + 1);

      const state = game.getState();
      if (state.handOver && state.lastPayout) {
        const payout = state.lastPayout;
        const isWinner = payout.winners.includes(0);
        if (payout.winners.length === 1 && isWinner) {
          Alert.alert('結果', `あなたが${payout.amounts[0]}チップ獲得しました！`);
        } else if (payout.winners.length > 1 && isWinner) {
          Alert.alert('結果', `スプリット: あなたが${payout.amounts[payout.winners.indexOf(0)]}チップ獲得しました`);
        }
      }
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {/* ポット表示 */}
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

      {/* CPUプレイヤー表示 */}
      {state.players.slice(1).map((player, index) => {
        const cpuId = (index + 1) as PlayerId;
        const cpuHand = game.getPlayerHand(cpuId);
        const isActive = state.toAct === cpuId;
        const showHand = state.handOver || winnerDisplay?.includes(cpuId);
        const lastAction = state.lastAction?.playerId === cpuId ? state.lastAction.action : null;

        return (
          <View key={cpuId} style={[styles.playerRow, isActive && styles.activePlayer]}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>
                {player.name} {player.cpuMode && `(${getModeName(player.cpuMode)})`}
              </Text>
              <Text style={styles.stackText}>スタック: {safeNumber(player.stack)}</Text>
              {player.isFolded && <Text style={styles.foldedText}>フォールド</Text>}
            </View>
            {cpuHand && (
              <Hand
                cards={player.hand}
                faceDown={!showHand}
              />
            )}
            {lastAction && (
              <Text style={styles.actionBadge}>
                {lastAction === 'fold' ? 'フォールド' :
                 lastAction === 'check' ? 'チェック' :
                 lastAction === 'call' ? 'コール' :
                 lastAction === 'bet' ? 'ベット' :
                 lastAction === 'raise' ? 'レイズ' : ''}
              </Text>
            )}
          </View>
        );
      })}

      {/* プレイヤーエリア */}
      <View style={[styles.playerRow, styles.playerArea, state.toAct === 0 && styles.activePlayer]}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>あなた</Text>
          <Text style={styles.stackText}>スタック: {safeNumber(state.players[0].stack)}</Text>
        </View>
        {playerHand && (
          <Hand
            cards={state.players[0].hand}
            selected={selectedCards}
            onCardPress={handleCardPress}
          />
        )}
        {state.drawPhase && (
          <Text style={styles.drawHint}>
            {selectedCards.length === 0 ? '交換するカードを選択' : `${selectedCards.length}枚交換`}
          </Text>
        )}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4c3a',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 8,
  },
  newGameButton: {
    backgroundColor: '#ffd700',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  newGameText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  winnerBanner: {
    backgroundColor: 'rgba(56, 239, 125, 0.8)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  winnerBannerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  potDisplay: {
    backgroundColor: '#ffd700',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  potLabel: {
    fontSize: 12,
    color: '#000',
    marginBottom: 4,
  },
  potAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  phaseBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4ecdc4',
  },
  phaseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  betInfoCompact: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  betInfoText: {
    fontSize: 13,
    color: '#ffd700',
    textAlign: 'center',
    fontWeight: '600',
  },
  playerRow: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  activePlayer: {
    borderWidth: 2,
    borderColor: '#4ecdc4',
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
  },
  playerArea: {
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  stackText: {
    fontSize: 14,
    color: '#ccc',
  },
  foldedText: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  actionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 4,
    borderRadius: 8,
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  drawHint: {
    fontSize: 12,
    color: '#4ecdc4',
    marginTop: 6,
    textAlign: 'center',
  },
  controlsContainer: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 8,
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
