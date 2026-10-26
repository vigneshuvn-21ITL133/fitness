import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

interface GrowthBarsProps {
  items: { label: string; value: number }[]; // value 0..1
  height?: number;
  color?: string;
}

/** Vertical month bars on a dim track, as in the "Growth" card. */
export function GrowthBars({ items, height = 92, color = colors.lilac }: GrowthBarsProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      <View style={[styles.row, { height }]}>
        {items.map((item) => (
          <View key={item.label} style={styles.column}>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { height: `${Math.min(Math.max(item.value, 0), 1) * 100}%`, backgroundColor: color },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {items.map((item) => (
          <Text key={item.label} style={styles.label}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 6,
  },
  column: {
    flex: 1,
    height: '100%',
  },
  track: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    borderRadius: 6,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 10,
  },
});
