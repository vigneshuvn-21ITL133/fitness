import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

const MIN = 15;
const MAX = 40;
const SEGMENTS = [
  { to: 18.5, color: colors.lilac },
  { to: 25, color: colors.mint },
  { to: 30, color: colors.yellow },
  { to: MAX, color: colors.orange },
];

/** Horizontal BMI scale with a marker at the user's value. */
export function BmiScale({ bmi }: { bmi: number }) {
  const styles = useThemedStyles(makeStyles);
  const clamped = Math.min(Math.max(bmi, MIN), MAX);
  const markerPct = ((clamped - MIN) / (MAX - MIN)) * 100;

  let start = MIN;
  return (
    <View>
      <View style={styles.track}>
        {SEGMENTS.map((seg) => {
          const width = ((Math.min(seg.to, MAX) - start) / (MAX - MIN)) * 100;
          start = seg.to;
          return <View key={seg.to} style={[styles.segment, { width: `${width}%`, backgroundColor: seg.color }]} />;
        })}
        <View style={[styles.marker, { left: `${markerPct}%` }]} />
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>{MIN}</Text>
        <Text style={styles.label}>18.5</Text>
        <Text style={styles.label}>25</Text>
        <Text style={styles.label}>30</Text>
        <Text style={styles.label}>{MAX}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'visible',
  },
  segment: {
    height: '100%',
  },
  marker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 20,
    marginLeft: -2,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
  },
});
