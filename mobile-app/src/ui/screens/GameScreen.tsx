import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Game } from '../../game/Game';
import { Hand } from '../components/Hand';
import { ActionButton } from '../components/ActionButton';
import { Action, PlayerId } from '../../game/types';

const safeNumber = (value: number | undefined | null): number => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }
  return value;
};

const getGamePhase = (street: number, drawPhase: boolean, bettingOpen: boolean, handOver: boolean): string => {
  if (handOver) return 'ゲーム終了';
  if (street === 0 && bettingOpen) return 'プリドローベット';
  if (drawPhase) {
    if (street === 1) return '1st ドロー';
    if (street === 2) return '2nd ドロー';
    if (street === 3) return '3rd ドロー';
    return 'ドロー';
  }
  if (bettingOpen) {
    if (street === 1) return '1st ベット';
    if (street === 2) return '2nd ベット';
    if (street === 3) return '3rd ベット';
    return 'ベッティング';
  }
  if (street === 3) return 'ショーダウン待ち';
  return '進行中';
};

export const GameScreen: React.FC = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);

  useEffect(() => {
    const newGame = new Game(100);
    setGame(newGame);
    setSelectedCards([]);
    setUpdateCounter(0);
  }, []);

  useEffect(() => {
    if (!game) return;

    const state = game.getState();
    if (state.bettingOpen && !state.handOver && state.toAct !== null && state.toAct !== 0) {
      const timer = setTimeout(() => {
        try {
          game.cpuAutoProgress();
        } catch (error) {
          console.error('CPU auto progress error:', error);
        } finally {
          setUpdateCounter(prev => prev + 1);
        }
      }, 180);

      return () => clearTimeout(timer);
    }
  }, [game, updateCounter]);

  const startNewGame = () => {
    const newGame = new Game(100);
    setGame(newGame);
    setSelectedCards([]);
    setUpdateCounter(prev => prev + 1);
  };

  const handleAction = (action: Action) => {
    if (!game) return;

    try {
      const state = game.getState();
      if (!state.bettingOpen) {
        Alert.alert('エラー', '今はベッティングできません');
        return;
      }
      if (state.toAct !== 0) {
        Alert.alert('エラー', 'あなたのターンではありません');
        return;
      }

      game.playerAction(action);
      setUpdateCounter(prev => prev + 1);
    } catch (error) {
      console.error('Action error:', error);
      Alert.alert('エラー', 'アクション実行中にエラーが発生しました');
    }
  };

  const handleCardPress = (index: number) => {
    if (!game) return;

    const state = game.getState();
    if (!state.drawPhase) return;

    if (selectedCards.includes(index)) {
      setSelectedCards(prev => prerev => [...prev, index]);
    }
  };

  const handleDraw = () => {
    if (!game) return;

    try {
      const state = game.getState();
      if (!state.drawPhase || state.handOver) return;

      const keepIndexes = [0, 1, 2, 3, 4].filter(i => !selectedCards.includes(i));
      game.playerDiscard(keepIndexes);
      game.cpuDiscard();
      game.afterAllDiscardAdvance();

      setSelectedCards([]);
      setUpdateCounter(prev => prev + 1);
    } catch (error) {
      console.error('Draw error:', error);
      Alert.alert('エラー', 'カード交換中にエラーが発生しました');
    }
  };

  const handleStandPat = () => {
    if (!game) return;

    try {
      const state = game.getState();
      if (!state.drawPhase || state.handOver) return;

      game.playerDiscard([0, 1, 2, 3, 4]);
      game.cpuDiscard();
      game.afterAllDiscardAdvance();

      setSelectedCards([]);
      setUpdateCounter(prev => prev + 1);
    } catch (error) {
      console.error('Stand pat error:', error);
      Alert.alert('エラー', 'スタンドパット中にエラーが発生しました');
    }
  };

  const handleShowdown = () => {
    if (!game) return;

    try {
      const state = game.getState();
      if (state.street !== 3 || state.bettingOpen || state.drawPhase || state.handOver) return;

      const res= result.winners.includes(0);
      if (isWinner) {
        const payout = result.payouts.find(p => p.playerId === 0);
        Alert.alert('ショーダウン', `あなたの勝ち！${payout?.amount || 0}チップ獲得`);
      } else {
        Alert.alert('ショーダウン', 'あなたの負け...');
      }
      setUpdateCounter(prev => prev + 1);
    } catch (error) {
      console.error('Showdown error:', error);
      Alert.alert('エラー', 'ショーダウン中にエラーが発生しました');
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

  const winnerDisplay: PlayerId[] | null = state.handOver && state.lastPayout ? state.lastPayout.winners : null;
  const actingLabel = state.toAct === null ? '-' : state.toAct === 0 ? 'あなた' : `CPU${state.toAct}`;
  const hintText = state.handOver
    ? 'ハンド終了: 「新しいゲーム」で次へ'
    : state.drawPhase
      ? '交換するカードを選択して「カード交換」'
      : myTurn
        ? 'あなたのターンです'
        : `${actingLabel} のアクション待ち`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>2-7 Triple Draw Poker</Text>
        <TouchableOpacity style={styles.newGameButton} onPress={startNewGa {winnerDisplay && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerBannerText}>
            {winnerDisplay.includes(0)
              ? `あなたの勝ち！ +${state.lastPayout?.amounts[winnerDisplay.indexOf(0)] || 0}`
              : 'あなたの負け'}
          </Text>
        </View>
      )}

      <View style={styles.statusRow}>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>ポット</Text>
          <Text style={styles.statusValue}>{safeNumber(state.pot)}</Text>
        </View>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>フェーズ</Text>
          <Text style={styles.statusSub}>{gamePhase}</Text>
        </View>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>アクター</Text>
          <Text style={styles.statusSub}>{actingLabel}</Text>
        </View>
      </View>

      {state.bettingOpen && !state.handOver &&      <Text style={styles.betInfoText}>
            現在ベット: {safeNumber(state.currentBet)} / {callAmount > 0 ? `コール: ${callAmount}` : 'チェック可能'} / サイズ: {betSize}
          </Text>
        </View>
      )}

      <Text style={[styles.hintText, myTurn && styles.hintActive]}>{hintText}</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.cpuGrid}>
          {state.players.slice(1).map((player, idx) => {
            const cpuId = (idx + 1) as PlayerId;
            const isActive = state.toAct === cpuId;
         tion?.playerId === cpuId ? state.lastAction.action : null;
            const revealed = !!(state.handOver || winnerDisplay?.includes(cpuId));

            return (
              <View key={player.id} style={[styles.cpuCard, isActive && styles.activeCpuCard]}>
                <Text style={styles.cpuName}>{player.name}</Text>
                <Text style={styles.cpuStack}>スタック: {safeNumber(player.stack)}</Text>
                {player.isFolded ? (
                  <Text style={styles.foldedText}>フォールド</Text>
                ) : (
                  <Text style={styles.hiddenCards}>{revealed ? 'ハンド公開' : '🂠 🂠 🂠 🂠 �          {lastAction && (
                  <Text style={styles.actionBadge}>
                    {lastAction === 'fold'
                      ? 'フォールド'
                      : lastAction === 'check'
                        ? 'チェック'
                        : lastAction === 'call'
                          ? 'コール'
                          : lastAction === 'bet'
                            ? 'ベット'
                            : 'レイズ'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.playerArea}>
          <Text style={    <Text style={styles.stackText}>スタック: {safeNumber(state.players[0].stack)}</Text>
          <Hand cards={state.players[0].hand} selected={selectedCards} onCardPress={handleCardPress} />
          {state.drawPhase && <Text style={styles.drawHint}>{selectedCards.length}枚選択中</Text>}
        </View>
      </ScrollView>

      <View style={styles.controlsContainer}>
        {state.drawPhase ? (
          <View style={styles.controls}>
            <ActionButton action="bet" label="カード交換" onPress={handleDraw} variant="info" disabled={state.handOver} />
            <ActionButton action="bet" lableStandPat} variant="success" disabled={state.handOver} />
          </View>
        ) : (
          <View style={styles.controls}>
            {state.legalActions.includes('fold') && (
              <ActionButton action="fold" label="フォールド" onPress={() => handleAction('fold')} variant="danger" disabled={!myTurn || state.handOver} />
            )}
            {(state.legalActions.includes('check') || state.legalActions.includes('call')) && (
              <ActionButton
                action={state.legalActions.includes('check') ? 'check' : 'call'}
                label={state.legalActions.includes('check') ? 'チェック' : `コール(${callAmount})`}
                onPress={() => handleAction(state.legalActions.includes('check') ? 'check' : 'call')}
                variant="success"
                disabled={!myTurn || state.handOver}
              />
            )}
            {(state.legalActions.includes('bet') || state.legalActions.includes('raise')) && (
              <ActionButton
     .legalActions.includes('bet') ? 'bet' : 'raise'}
                label={state.legalActions.includes('bet') ? `ベット(${betSize})` : `レイズ(${betSize})`}
                onPress={() => handleAction(state.legalActions.includes('bet') ? 'bet' : 'raise')}
                variant="warning"
                disabled={!myTurn || state.handOver}
              />
            )}
            {state.street === 3 && !state.bettingOpen && !state.drawPhase && !state.handOver && (
              <ActionButton action="bet" label="ショーダウン" onPress={handleShowdown} variant="primary" />
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: {
    fontSize: 20,
    fontr: '#ffd700',
  },
  newGameButton: {
    backgroundColor: '#ffd700',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  newGameText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  winnerBanner: {
    backgroundColor: 'rgba(56, 239, 125, 0.8)',
    padding: 10,
    alignItems: 'center',
  },
  winnerBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  statusBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.45)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  statusLabel: {
    color: '#d5d5d5',
    fontSize: 11,
    textAlign: 'center',
  },
  statusValue: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusSub: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  betInfoBar: {
    marginTop: 8,
    marginHorizontal: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,215,0,0.18)',
  },
  betInfoText: {
    fontSize: 13,
    color: '#ffd700',
    textAlign: 'center',
    fontWeight: '600',
  },
  hintText: {
    marginTop: 8,
    marginHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    textAlign: 'center',
    color: '#d7f5ff',
    backgroundColor: 'rgba(70,126,158,0.35)',
    fontSize: 13,
  },
  hintActive: {
    color: '#0f4c3a',
    backgroundColor: '#4ecdc4',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 16,
  },
  cpuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  cpuCard: {
    width: '49%',
    minHeight: 102,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeCpuCard: {
    borderWidth: 2,
    borderColor: '#4ecdc4',
    backgroundColor: 'rgba(78,205,196,0.2)',
  },
  cpuName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cpuStack: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  foldedText: {
    marginTop: 5,
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  hiddenCards: {
    marginTop: 6,
    color: '#b7d9ce',
    fontSize: 14,
    letterSpacing: 1,
  },
  actionBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  playerArea: {
    marginTop: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  stackText: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 15,
    color: '#fff',
  },
  drawHint: {
    marginTop: 6,
    fontSize: 13,
    color: '#4ecdc4',
    textAlign: 'center',
    fontWeight: '600',
  },
  controlsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
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
