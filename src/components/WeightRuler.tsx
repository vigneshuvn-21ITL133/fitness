import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

interface WeightRulerProps {
  value: number;
  min: number;
  max: number;
  step?: number; // tick every `step` units
  unit: string;
}

/** Scale of tick marks with a centre indicator, as in the "Health overview" card. */
export function WeightRuler({ value, min, max, step = 1, unit }: WeightRulerProps) {
  const styles = useThemedStyles(makeStyles);
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  const fraction = (value - min) / (max - min);

  return (
    <View style={styles.wrap}>
      <View style={styles.bubbleRow}>
        <View style={[styles.bubble, { left: `${Math.min(Math.max(fraction, 0.05), 0.95) * 100}%` }]}>
          <Text style={styles.bubbleText}>
            {value}
            {unit}
          </Text>
        </View>
      </View>
      <View style={styles.ticks}>
        {ticks.map((tick) => {
          const major = tick % 5 === 0;
          const active = tick === Math.round(value);
          return (
            <View
              key={tick}
              style={[
                styles.tick,
                { height: major ? 26 : 14 },
                active && styles.tickActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: {
    height: 70,
    justifyContent: 'flex-end',
  },
  bubbleRow: {
    height: 22,
    position: 'relative',
  },
  bubble: {
    position: 'absolute',
    transform: [{ translateX: -22 }],
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  ticks: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tick: {
    width: 2,
    backgroundColor: colors.textFaint,
    borderRadius: 1,
  },
  tickActive: {
    backgroundColor: colors.mint,
    width: 3,
  },
});
