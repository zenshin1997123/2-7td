import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GameState } from '../../game/types';

interface StatusPanelProps {
  state: GameState;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ state }) => {
  const actionLabels: Record<string, string> = {
    player: 'あなた',
    cpu: 'CPU',
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.label}>ストリート</Text>
          <Text style={styles.value}>{state.street}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>ドロー回数</Text>
          <Text style={styles.value}>{state.turnDraw}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.label}>行動権</Text>
          <Text style={styles.value}>
            {state.toAct ? actionLabels[state.toAct] : '-'}
          </Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>ベット状態</Text>
          <Text style={styles.value}>
            {state.bettingOpen ? 'ベット中' : '終了'}
          </Text>
        </View>
      </View>
      {state.currentBet > 0 && (
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>現在のベット</Text>
            <Text style={styles.value}>{state.currentBet}</Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.label}>コール必要額</Text>
            <Text style={styles.value}>
              {state.currentBet - state.playerContrib}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 16,
    margin: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
