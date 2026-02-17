import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card as CardType } from '../../game/types';
import { getRankString, getSuitString, getCardColor } from '../../game/Card';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onPress?: () => void;
  faceDown?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  card, 
  selected = false, 
  onPress,
  faceDown = false 
}) => {
  const rankStr = getRankString(card[0]);
  const suitStr = getSuitString(card[1]);
  const color = getCardColor(card[1]);

  if (faceDown) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.faceDown]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.backPattern}>
          <Text style={styles.backText}>🂠</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.selected,
        color === 'red' && styles.redCard,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.rank, color === 'red' && styles.redText]}>
          {rankStr}
        </Text>
        <Text style={[styles.suit, color === 'red' && styles.redText]}>
          {suitStr}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 55,
    height: 77,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selected: {
    borderColor: '#4ecdc4',
    borderWidth: 3,
    transform: [{ translateY: -10 }],
    shadowColor: '#4ecdc4',
    shadowOpacity: 0.5,
  },
  redCard: {
    borderColor: '#c00',
  },
  faceDown: {
    backgroundColor: '#1a5f3f',
    borderColor: '#0d3b2d',
  },
  cardContent: {
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  suit: {
    fontSize: 20,
    color: '#000',
  },
  redText: {
    color: '#c00',
  },
  backPattern: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 40,
    opacity: 0.3,
  },
});
