import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Card as CardType } from '../../game/types';

interface HandProps {
  cards: CardType[];
  selected?: number[];
  onCardPress?: (index: number) => void;
  faceDown?: boolean;
}

export const Hand: React.FC<HandProps> = ({
  cards,
  selected = [],
  onCardPress,
  faceDown = false,
}) => {
  return (
    <View style={styles.container}>
      {cards.map((card, index) => (
        <Card
          key={index}
          card={card}
          selected={selected.includes(index)}
          onPress={onCardPress ? () => onCardPress(index) : undefined}
          faceDown={faceDown}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    padding: 4,
  },
});
