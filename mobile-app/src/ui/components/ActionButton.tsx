import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Action } from '../../game/types';

interface ActionButtonProps {
  action: Action;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info';
}

const actionLabels: Record<Action, string> = {
  fold: 'フォールド',
  check: 'チェック',
  call: 'コール',
  bet: 'ベット',
  raise: 'レイズ',
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, styles[variant], disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  primary: {
    backgroundColor: '#667eea',
  },
  success: {
    backgroundColor: '#11998e',
  },
  danger: {
    backgroundColor: '#eb3349',
  },
  warning: {
    backgroundColor: '#f093fb',
  },
  info: {
    backgroundColor: '#4facfe',
  },
  disabled: {
    opacity: 0.5,
  },
});
