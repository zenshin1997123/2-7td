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

const positionLabel = (playerId: PlayerId, dealerPosition: number): string => {
  const rel = (playerId - dealerPosition + 6) % 6;
  if (rel === 0) return 'BTN';
  if (rel === 1) return 'SB';
  if (rel === 2) return 'BB';
  if (rel === 3) return 'UTG';
  if (rel === 4) return 'HJ';
  return 'CO';
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

  // プレイヤーがフォールドしている場合はCPUだけで自動的にハンドを完結させる
  useEffect(() => {
    if (!game) return;
    const s = game.getState();
    if (s.players[0].isFolded && !s.handOver) {
      game.autoRunToEndIfPlayerFolded();
      refresh();
    }
  }, [game, tick]);

  useEffect(() => {
    if (!game) return;
    const s = game.getState();
    if (s.street === 3 && !s.drawPhase && !s.bettingOpen && !s.handOver) {
      // #region agent log
      fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run-showdown-ui', hypothesisId: 'H8', location: 'GameScreen.tsx:auto-showdown', message: 'auto showdown triggered', data: { street: s.street, drawPhase: s.drawPhase, bettingOpen: s.bettingOpen, handOver: s.handOver }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      game.showdown();
      refresh();
    }
  }, [game, tick]);

  // ハンド終了時に自動的に次のハンドを開始（スタックを保持）
  useEffect(() => {
    if (!game) return;
    const s = game.getState();
    if (s.handOver && s.lastPayout) {
      // 少し待ってから次のハンドを開始（勝者表示を見せるため）
      const timer = setTimeout(() => {
        game.startNextHand();
        setSelectedCards([]);
        refresh();
      }, 2000); // 2秒後に次のハンド開始
      return () => clearTimeout(timer);
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
  const winnerNames = state.lastPayout
    ? state.lastPayout.winners.map(id => (id === 0 ? 'あなた' : `CPU${id}`)).join(', ')
    : '';

  // #region agent log
  fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run-compile-fix', hypothesisId: 'H3', location: 'GameScreen.tsx:render', message: 'render snapshot', data: { myTurn, drawPhase: state.drawPhase, legalActions: state.legalActions, toAct: state.toAct }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  // #region agent log
  fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run-showdown-ui', hypothesisId: 'H9', location: 'GameScreen.tsx:winner-banner', message: 'winner ui state', data: { handOver: state.handOver, hasLastPayout: !!state.lastPayout, winnerNames }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion

  const onAction = (action: Action) => {
    // #region agent log
    fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run-bet-loop', hypothesisId: 'H1', location: 'GameScreen.tsx:onAction:click', message: 'action button clicked', data: { action, myTurn, toAct: state.toAct, legalActions: state.legalActions, currentBet: state.currentBet, playerContrib: state.players[0].contrib }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion

    if (!myTurn) {
      Alert.alert('エラー', 'あなたのターンではありません');
      return;
    }
    try {
      game.playerAction(action);
      const after = game.getState();
      // #region agent log
      fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: 'run-bet-loop', hypothesisId: 'H2', location: 'GameScreen.tsx:onAction:after', message: 'action handled', data: { action, toAct: after.toAct, legalActions: after.legalActions, currentBet: after.currentBet, playerContrib: after.players[0].contrib, street: after.street, drawPhase: after.drawPhase }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      refresh();
    } catch (error) {
      console.error('Action error:', error);
      Alert.alert('エラー', 'アクションの実行に失敗しました');
    }
  };

  const onCardPress = (index: number) => {
    if (!state.drawPhase || state.players[0].isFolded) return;
    if (selectedCards.includes(index)) {
      setSelectedCards(prev => prev.filter(i => i !== index));
      return;
    }
    if (selectedCards.length < 5) {
      setSelectedCards(prev => [...prev, index]);
    }
  };

  const onDraw = () => {
    if (!state.drawPhase || state.handOver || state.players[0].isFolded) return;
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
    if (!state.drawPhase || state.handOver || state.players[0].isFolded) return;
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

      <Text style={styles.infoText}>
        フェーズ: {phaseText(state.street, state.drawPhase, state.bettingOpen, state.handOver)} / 現在アクター: {state.toAct === null ? '-' : state.toAct === 0 ? 'あなた' : `CPU${state.toAct}`}
      </Text>
      {state.handOver && state.lastPayout && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerText}>勝者: {winnerNames}</Text>
          <Text style={styles.winnerText}>配当: {state.lastPayout.amounts.join(', ')}</Text>
        </View>
      )}

      <View style={styles.tableWrap}>
        <View style={styles.tableOval}>
          <View style={styles.centerPot}>
            <Text style={styles.centerPotLabel}>POT</Text>
            <Text style={styles.centerPotAmount}>{safeNumber(state.pot)}</Text>
            <Text style={styles.centerPotSub}>Bet {safeNumber(state.currentBet)}</Text>
          </View>

          {([3, 2, 1, 5, 4] as PlayerId[]).map(cpuId => {
            const player = state.players[cpuId];
            const isActive = state.toAct === cpuId;
            const showCards = state.handOver && !player.isFolded && player.hand.length > 0;
            const seatStyle =
              cpuId === 3 ? styles.seatTop :
              cpuId === 2 ? styles.seatTopRight :
              cpuId === 1 ? styles.seatBottomRight :
              cpuId === 5 ? styles.seatBottomLeft : styles.seatTopLeft;

            return (
              <View key={cpuId} style={[styles.seat, seatStyle, isActive && styles.activeSeat]}>
                <Text style={styles.seatName}>{player.name}</Text>
                <Text style={styles.seatMeta}>{positionLabel(cpuId, state.dealerPosition)} / {safeNumber(player.stack)}</Text>
                {showCards ? (
                  <Hand cards={player.hand} />
                ) : (
                  <Text style={styles.seatCards}>{player.isFolded ? 'Fold' : '🂠 🂠 🂠 🂠 🂠'}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.playerArea}>
        <Text style={styles.playerText}>あなた ({positionLabel(0, state.dealerPosition)}) / スタック: {safeNumber(state.players[0].stack)}</Text>
        <Hand cards={state.players[0].hand} selected={selectedCards} onCardPress={state.players[0].isFolded ? undefined : onCardPress} />
        {state.drawPhase && !state.players[0].isFolded && <Text style={styles.infoText}>選択中: {selectedCards.length}枚</Text>}
      </View>

      <View style={styles.controls}>
        {state.drawPhase && !state.players[0].isFolded ? (
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
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#1f2937',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fbbf24' },
  newGameButton: { backgroundColor: '#ffd700', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16 },
  newGameText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  loadingText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 50 },
  infoText: { color: '#fff', fontSize: 13, marginHorizontal: 10, marginTop: 6 },
  winnerBanner: {
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  winnerText: { color: '#ffd700', fontSize: 13, fontWeight: 'bold' },
  tableWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tableOval: {
    width: '100%',
    maxWidth: 980,
    height: 370,
    borderRadius: 240,
    backgroundColor: '#4c1d95',
    borderWidth: 10,
    borderColor: '#7c3aed',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPot: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  centerPotLabel: { color: '#e5e7eb', fontSize: 11 },
  centerPotAmount: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  centerPotSub: { color: '#cbd5e1', fontSize: 11 },
  seat: {
    position: 'absolute',
    width: 180,
    minHeight: 72,
    borderRadius: 10,
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderWidth: 1,
    borderColor: '#374151',
    padding: 6,
  },
  activeSeat: { borderColor: '#22d3ee', borderWidth: 2 },
  seatTop: { top: 10, left: '50%', marginLeft: -90 },
  seatTopLeft: { top: 70, left: 20 },
  seatTopRight: { top: 70, right: 20 },
  seatBottomLeft: { bottom: 36, left: 20 },
  seatBottomRight: { bottom: 36, right: 20 },
  seatName: { color: '#fef3c7', fontWeight: 'bold', fontSize: 13 },
  seatMeta: { color: '#d1d5db', fontSize: 11, marginBottom: 2 },
  seatCards: { color: '#e5e7eb', fontSize: 13 },
  playerArea: {
    marginTop: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.9)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd700',
    marginHorizontal: 10,
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
