import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Game } from '../../game/Game';
import { Hand } from '../components/Hand';
import { ActionButton } from '../components/ActionButton';
import { Action, PlayerId } from '../../game/types';

const ENDPOINT = 'http://127.0.0.1:7244/ingest/a882fc18-c173-4194-91b2-3fc89fa661a7';

const safeNumber = (value: number | undefined | null): number => {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return value;
};

const getGamePhase = (street: number, drawPhase: boolean, bettingOpen: boolean, handOver: boolean): string => {
  if (handOver) return 'ゲーム終了';
  if (drawPhase) return `${street}回目ドロー`;
  if (bettingOpen) return `${street}回目ベット`;
  if (street === 3) return 'ショーダウン待ち';
  return '進行中';
};t [game, setGame] = useState<Game | null>(null);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const g = new Game(100);
    setGame(g);
    // #region agent log
    fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'run-compile-fix',hypothesisId:'H3',location:'GameScreen.tsx:init',message:'game initialized',data:{ok:true},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, []);

  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!game) return;
    const s = game.getState();
    // #region agent log
    fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'run-compile-fix',hypothesisId:'H4',location:'GameScreen.tsx:cpu-progress',message:'cpu progress check',data:{toAct:s.toAct,bettingOpen:s.bettingOpen,handOver:s.handOver},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (s.bettingOpen && !s.handOver && s.toAct !== null && s.toAct !== 0) {
      game.cpuAutoProgress();
      refresh();
    }
  }, [game, version]);

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
  const winnerDisplay: PlayerId[] | null = state.handOver && state.lastPayout ? state.lastPayout.winners : null;

  const hintText = useMemo(() => {
    if (state.handOver) return 'ハンド終了: 新しいゲームを開始してください';
    if (state.drawPhase) return '交換するカードを選択して「カード交換」';
    if (myTurn) retuです' : `CPU${state.toAct} のアクション待ち`;
  }, [state.handOver, state.drawPhase, myTurn, state.toAct]);

  // #region agent log
  fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'run-compile-fix',hypothesisId:'H5',location:'GameScreen.tsx:render',message:'render snapshot',data:{myTurn,drawPhase:state.drawPhase,legalActions:state.legalActions},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const handleAction = (action: Action) => {
    if (!myTurn) {
      Alert.alert('エラー', 'あなたのターンではありません');
      return;
    }
    try {
      game.playerAction(action);
      refresh();
    } catch (error) {
      console.error('Action error:', error);
      Alert.alert('エラー', 'アクション実行中にエラーが発生しました');
    }
  };

  const handleCardPress = (index: number) => {
    if (!state.drawPhase) return;
    if (selectedCards.includes(index)) {
      setSelectedCards(prev => prev.fdCards(prev => [...prev, index]);
    }
  };

  const handleDraw = () => {
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
      Alert.alert('エラー', 'カード交換中にエラーが発生しました');
    }
  };

  const handleStandPat = () => {
    if (!state.drawPhase || state.handOver) return;
    try {
      game.playerDiscard([0, 1, 2, 3, 4]);
      game.cpuDiscard();
      game.afterAllDiscardAdvance();
      setSelectedCards([]);
      refresh();
    } catch (error) {
      console.error('Stand pat error:', error);
      Alert.alert('エラー', 'スタンドパット中にエラーが発生しました');
    }
  };

  const handleShowdown = () => {
    if (state.street !== 3 || state.bettiname.showdown();
      const isWinner = result.winners.includes(0);
      if (isWinner) {
        const payout = result.payouts.find(p => p.playerId === 0);
        Alert.alert('ショーダウン', `あなたの勝ち！${payout?.amount || 0}チップ獲得`);
      } else {
        Alert.alert('ショーダウン', 'あなたの負け...');
      }
      refresh();
    } catch (error) {
      console.error('Showdown error:', error);
      Alert.alert('エラー', 'ショーダウン中にエラーが発生しました');
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

      {winnerDisplay && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerBannerText}>{winnerDisplay.includes(0) ?styles.statusText}>ポット: {safeNumber(state.pot)}</Text>
        <Text style={styles.statusText}>フェーズ: {getGamePhase(state.street, state.drawPhase, state.bettingOpen, state.handOver)}</Text>
      </View>

      {state.bettingOpen && !state.handOver && (
        <Text style={styles.betText}>現在ベット: {safeNumber(state.currentBet)} / {callAmount > 0 ? `コール: ${callAmount}` : 'チェック可能'} / サイズ: {betSize}</Text>
      )}

      <Text style={[styles.hintText, myTurn && styles.hintActive]}>{hintTexte={styles.scrollContent}>
        <View style={styles.cpuGrid}>
          {state.players.slice(1).map((player, idx) => {
            const cpuId = (idx + 1) as PlayerId;
            const isActive = state.toAct === cpuId;
            const lastAction = state.lastAction?.playerId === cpuId ? state.lastAction.action : null;
            const revealed = !!(state.handOver || winnerDisplay?.includes(cpuId));
            return (
              <View key={player.id} style={[styles.cpuCard, isActive && styles.activeCpuCard]}>
                <Text style={styles.cpuName}>{player.name}</Text>
                <Text style={styles.cpuStack}>スタック: {safeNumber(player.stack)}</Text>
                <le={styles.hiddenCards}>{player.isFolded ? 'フォールド' : revealed ? 'ハンド公開' : '🂠 🂠 🂠 🂠 🂠'}</Text>
                {lastAction && <Text style={styles.actionBadge}>{lastAction}</Text>}
              </View>
            );
          })}
        </View>

        <View style={styles.playerArea}>
  ayerName}>あなた</Text>
          <Text style={styles.stackText}>スタック: {safeNumber(state.players[0].stack)}</Text>
          <Hand cards={state.players[0].hand} selected={selectedCards} onCardPress={handleCardPress} />
          {state.drawPhase && <Text style={styles.drawHint}>{selectedCards.length}枚選択中</Text>}
        </View>
      </ScrollView>

      <View style={styles.controlsContainer}>
        {state.drawPhase ? (
          <View style={styles.controls}>
            <ActionButton action="bet" label="カード交換" onPress={handleDraw} variant="info" disabled={state.handOver} />
            <ActionButton action="bet" label="スタンドパット" onPress={handleStandPat} variant="success" disabled={state.handOver} />
          </View>
        ) : (
          <View style={styles.controls}>
            {state.legalActions.includes('fold') && <ActionButton action="fold" label="フォールド" onPress={() => handleAction('fold')} variant="danger" disabled={!myTurn || state.handOver}|| state.legalActions.includes('call')) && (
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
                action={state.legalActions.includes('bet') ? 'bet' : 'raise'}
                label={state.legalActions.includes('bet') ? `ベット(${betSize})` : `レイズ(${betSize})`}
                onPress={() => handleAction(state.legalActions.includes('bet') ? 'bet' : 'raise')}
                variant="warning"
                disabled={!myTurn || state.handOver}
              />
            )}
          state.bettingOpen && !state.drawPhase && !state.handOver && <ActionButton action="bet" label="ショーダウン" onPress={handleShowdown} variant="primary" />}
          </View>
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
  winnerBanner: { backgroundColor: 'rgba(56, 239, 125, 0.8)', padding: 10, alignItems: 'center' },
  winnerBannerText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  statusRow: { paddingHorizontal: 10, paddingTop: 10, gap: 4 },
  statusText:fff', fontSize: 13 },
  betText: { marginHorizontal: 10, marginTop: 8, color: '#ffd700', fontSize: 13 },
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
  hintActive: { color: '#0f4c3a', backgroundColor: '#4ecdc4', fontWeight: '700' },
  scrollContent: { padding: 10, paddingBottom: 16 },
  cpuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  cpuCard: {
    width: '49%',
    minHeight: 102,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeCpuCard: { borderWidth: 2, borderColor: '#4ecdc4', backgroundColor: 'rgba(78,205,196,0.2)' },
  cpuName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  cpuStack: { color: '#ccc', fontSize: 12, marginTop: 2 },
  hiddenCards: { marginTop: 6, color: '#b7d9ce', fontSize: 14, letterSpacing: 1 },
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
  playerName: { fontSize: 18, fontWeight: 'bold', color: '#ffd700' },
  stackText: { marginTop: 4, marginBottom: 8, fontSize: 15, color: '#fff' },
  drawHint: { marginTop: 6, fontSize: 13, color: '#4ecdc4', textAlign: 'center', fontWeight: '600' },
  controlsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 50 },
});
