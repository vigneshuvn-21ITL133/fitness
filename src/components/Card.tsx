import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'green';
}

export function Card({ children, style, tone = 'default' }: CardProps) {
  return (
    <View style={[styles.base, tone === 'green' ? styles.green : styles.default, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  default: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
  },
  green: {
    backgroundColor: colors.cardGreen,
    borderColor: 'rgba(168, 232, 218, 0.12)',
  },
});
