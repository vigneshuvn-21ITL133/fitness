import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors } from '@/theme';

export interface ChartSeries {
  color: string;
  /** One value per x position. `null` leaves a gap. */
  values: (number | null)[];
  label?: string;
}

interface LineChartProps {
  series: ChartSeries[];
  labels: string[];
  height?: number;
  /** Fixed y-axis bounds. Defaults to the data range with padding. */
  yMin?: number;
  yMax?: number;
  unit?: string;
}

const WIDTH = 320;
const PAD = { top: 12, bottom: 22, left: 36, right: 12 };

/** Simple multi-series line chart with gridlines and sparse x labels. */
export function LineChart({ series, labels, height = 160, yMin, yMax, unit = '' }: LineChartProps) {
  const styles = useThemedStyles(makeStyles);
  const { lo, hi } = useMemo(() => {
    const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
    if (all.length === 0) return { lo: yMin ?? 0, hi: yMax ?? 1 };
    const dataLo = Math.min(...all);
    const dataHi = Math.max(...all);
    const pad = Math.max((dataHi - dataLo) * 0.15, 1);
    return {
      lo: yMin ?? Math.floor(dataLo - pad),
      hi: yMax ?? Math.ceil(dataHi + pad),
    };
  }, [series, yMin, yMax]);

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const n = labels.length;
  const xFor = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  const gridValues = [hi, (hi + lo) / 2, lo];
  const labelStep = Math.max(1, Math.ceil(n / 5));

  if (series.every((s) => s.values.every((v) => v === null))) {
    return <Text style={styles.empty}>Add entries to see a chart.</Text>;
  }

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
        {gridValues.map((g, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yFor(g)}
              y2={yFor(g)}
              stroke={colors.cardBorder}
              strokeWidth={1}
            />
          </React.Fragment>
        ))}
        {series.map((s, si) => {
          // Break the path into runs wherever a value is missing.
          const runs: string[] = [];
          let current = '';
          s.values.forEach((v, i) => {
            if (v === null) {
              if (current) runs.push(current);
              current = '';
              return;
            }
            current += current === '' ? `M ${xFor(i)} ${yFor(v)}` : ` L ${xFor(i)} ${yFor(v)}`;
          });
          if (current) runs.push(current);
          return (
            <React.Fragment key={si}>
              {runs.map((d, ri) => (
                <Path key={ri} d={d} stroke={s.color} strokeWidth={2} fill="none" />
              ))}
              {s.values.map((v, i) =>
                v === null ? null : (
                  <Circle key={i} cx={xFor(i)} cy={yFor(v)} r={3.5} fill={s.color} />
                ),
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.yAxis} pointerEvents="none">
        <Text style={styles.axisText}>
          {Math.round(hi)}
          {unit}
        </Text>
        <Text style={styles.axisText}>
          {Math.round(lo)}
          {unit}
        </Text>
      </View>
      <View style={styles.xAxis}>
        {labels.map((label, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <Text key={i} style={styles.axisText}>
              {label}
            </Text>
          ) : (
            <View key={i} style={styles.spacer} />
          ),
        )}
      </View>
      {series.some((s) => s.label) ? (
        <View style={styles.legend}>
          {series
            .filter((s) => s.label)
            .map((s) => (
              <View key={s.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={styles.axisText}>{s.label}</Text>
              </View>
            ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  yAxis: {
    position: 'absolute',
    left: 0,
    top: PAD.top - 8,
    bottom: PAD.bottom,
    justifyContent: 'space-between',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: PAD.left,
    marginTop: 2,
  },
  spacer: {
    width: 1,
  },
  axisText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
    paddingLeft: PAD.left,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
