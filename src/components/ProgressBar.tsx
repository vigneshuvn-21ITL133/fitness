import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

interface ProgressBarProps {
  label: string;
  valueLabel: string;
  progress: number; // 0..1
  color: string;
}

/** Labelled horizontal bar used for the Work / Sleep balance rows. */
export function ProgressBar({ label, valueLabel, progress, color }: ProgressBarProps) {
  const styles = useThemedStyles(makeStyles);
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{valueLabel}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
