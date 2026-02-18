import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Game } from '../../game/Game';
import { Hand } from '../components/Hand';
import { ActionButton } from '../components/ActionButton';
import { Action, PlayerId } from '../../game/types';

const LOG_ENDPOINT = 'http://127.0.0.1:7244/ingest/a882fc18-c173-4194-91b2-3fc89fa661a7';

const safeNumber = (value: number | undefined | null): number => {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return value;
};

const phaseText = (street: number, drawPhase: boolean, bettingOpen: boolean, handOver: boolean): string => {
  if (handOver) return 'ゲーム終了';
  if (drawPhase) return `ドロー ${street}`;
  if (bettingOpen) return `ベット ${street}`;
  if (street === 3) return 'ショーダウン待ち';
  return '進行中';
};

export const GameScreen: React.FC = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick(prev => prev + 1);

  useEffect(() => {
    const g = new Game(100);
    setGame(g);
    setSelectedCards([]);
    // #region agent log
    fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run-compile-fix', hypothesisId: 'H1', location: 'GameScreen.tsx:init', message: 'game initialized', data: { ok: true }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
  }, []);

  useEffect(() => {
    if (!game) return;
    const s = game.getState();
    // #region agent log
    fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run-compile-fix', hypothesisId: 'H2', location: 'GameScreen.tsx:cpu-check', message: 'cpu turn check', data: { toAct: s.toAct, bettingOpen: s.bettingOpen, handOver: s.handOver }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    if (s.bettingOpen && !s.handOver && s.toAct !== null && s.toAct !== 0) {
      game.cpuAutoProgress();
      refresh();
    }
  }, [game, tick]);

  const startNewGame = () => {
    const g = new Game(100);
    setGame(g);
    setSelectedCards([]);
    refresh();
  };

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>ゲームを開始しています...</Text>
      </View>
    );
  }

  const state = game.getState();
  const myTurn = state.bettingOpen && state.toAct === 0;
  const callAmount = Math.max(0, state.currentBet - state.players[0].contrib);
  const betSize = state.street <= 1 ? 2 : 4;

  // #region agent log
  fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run-compile-fix', hypothesisId: 'H3', location: 'GameScreen.tsx:render', message: 'render snapshot', data: { myTurn, drawPhase: state.drawPhase, legalActions: state.legalActions, toAct: state.toAct }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion

  const onAction = (action: Action) => {
    if (!myTurn) {
      Alert.alert('エラー', 'あなたのターンではありません');
      return;
    }
    try {
      game.playerAction(action);
      refresh();
    } catch (error) {
      console.error('Action error:', error);
      Alert.alert('エラー', 'アクションの実行に失敗しました');
    }
  };

  const onCardPress = (index: number) => {
    if (!state.drawPhase) return;
    if (selectedCards.includes(index)) {
      setSelectedCards(prev => prev.filter(i => i !== index));
      return;
    }
    if (selectedCards.length < 5) {
      setSelectedCards(prev => [...prev, index]);
    }
  };

  const onDraw = () => {
    if (!state.drawPhase || state.handOver) return;
    try {
      const keepIndexes = [0, 1, 2, 3, 4].filter(i => !selectedCards.includes(i));
      game.playerDiscard(keepIndexes);
      game.cpuDiscard();
      game.afterAllDiscardAdvance();
      setSelectedCards([]);
      refresh();
    } catch (error) {
      console.error('Draw error:', error);
      Alert.alert('エラー', 'カード交換に失敗しました');
    }
  };

  const onStandPat = () => {
    if (!state.drawPhase || state.handOver) return;
    try {
      game.playerDiscard([0, 1, 2, 3, 4]);
      game.cpuDiscard();
      game.afterAllDiscardAdvance();
      setSelectedCards([]);
      refresh();
    } catch (error) {
      console.error('StandPat error:', error);
      Alert.alert('エラー', 'スタンドパットに失敗しました');
    }
  };

  const onShowdown = () => {
    if (state.street !== 3 || state.bettingOpen || state.drawPhase || state.handOver) return;
    try {
      const result = game.showdown();
      const win = result.winners.includes(0);
      Alert.alert('ショーダウン', win ? 'あなたの勝ち' : 'あなたの負け');
      refresh();
    } catch (error) {
      console.error('Showdown error:', error);
      Alert.alert('エラー', 'ショーダウンに失敗しました');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>2-7 Triple Draw Poker</Text>
        <TouchableOpacity style={styles.newGameButton} onPress={startNewGame}>
          <Text style={styles.newGameText}>新しいゲーム</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.infoText}>ポット: {safeNumber(state.pot)} / フェーズ: {phaseText(state.street, state.drawPhase, state.bettingOpen, state.handOver)}</Text>
      <Text style={styles.infoText}>現在アクター: {state.toAct === null ? '-' : state.toAct === 0 ? 'あなた' : `CPU${state.toAct}`}</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {state.players.slice(1).map((player, idx) => {
          const cpuId = (idx + 1) as PlayerId;
          const isActive = state.toAct === cpuId;
          return (
            <View key={player.id} style={[styles.cpuRow, isActive && styles.activeRow]}>
              <Text style={styles.cpuText}>{player.name} / スタック: {safeNumber(player.stack)}</Text>
              <Text style={styles.cpuText}>{player.isFolded ? 'フォールド' : '🂠 🂠 🂠 🂠 🂠'}</Text>
            </View>
          );
        })}

        <View style={styles.playerArea}>
          <Text style={styles.playerText}>あなた / スタック: {safeNumber(state.players[0].stack)}</Text>
          <Hand cards={state.players[0].hand} selected={selectedCards} onCardPress={onCardPress} />
          {state.drawPhase && <Text style={styles.infoText}>選択中: {selectedCards.length}枚</Text>}
        </View>
      </ScrollView>

      <View style={styles.controls}>
        {state.drawPhase ? (
          <>
            <ActionButton action="bet" label="カード交換" onPress={onDraw} variant="info" disabled={state.handOver} />
            <ActionButton action="bet" label="スタンドパット" onPress={onStandPat} variant="success" disabled={state.handOver} />
          </>
        ) : (
          <>
            {state.legalActions.includes('fold') && <ActionButton action="fold" label="フォールド" onPress={() => onAction('fold')} variant="danger" disabled={!myTurn || state.handOver} />}
            {(state.legalActions.includes('check') || state.legalActions.includes('call')) && (
              <ActionButton
                action={state.legalActions.includes('check') ? 'check' : 'call'}
                label={state.legalActions.includes('check') ? 'チェック' : `コール(${callAmount})`}
                onPress={() => onAction(state.legalActions.includes('check') ? 'check' : 'call')}
                variant="success"
                disabled={!myTurn || state.handOver}
              />
            )}
            {(state.legalActions.includes('bet') || state.legalActions.includes('raise')) && (
              <ActionButton
                action={state.legalActions.includes('bet') ? 'bet' : 'raise'}
                label={state.legalActions.includes('bet') ? `ベット(${betSize})` : `レイズ(${betSize})`}
                onPress={() => onAction(state.legalActions.includes('bet') ? 'bet' : 'raise')}
                variant="warning"
                disabled={!myTurn || state.handOver}
              />
            )}
            {state.street === 3 && !state.bettingOpen && !state.drawPhase && !state.handOver && (
              <ActionButton action="bet" label="ショーダウン" onPress={onShowdown} variant="primary" />
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f4c3a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ffd700' },
  newGameButton: { backgroundColor: '#ffd700', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16 },
  newGameText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  loadingText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 50 },
  infoText: { color: '#fff', fontSize: 13, marginHorizontal: 10, marginTop: 6 },
  scrollContent: { padding: 10, paddingBottom: 16 },
  cpuRow: { backgroundColor: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 8, marginBottom: 8 },
  activeRow: { borderWidth: 2, borderColor: '#4ecdc4' },
  cpuText: { color: '#fff', fontSize: 13 },
  playerArea: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  playerText: { color: '#ffd700', fontSize: 15, fontWeight: 'bold' },
  controls: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
});
