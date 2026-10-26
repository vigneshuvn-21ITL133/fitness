import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { colors } from '@/theme';
import type { SleepSegment, SleepStage } from '@/types';

const STAGE_LEVEL: Record<SleepStage, number> = { awake: 0, light: 1, deep: 2 };
const STAGE_COLOR: Record<SleepStage, string> = {
  awake: colors.mint,
  light: colors.yellow,
  deep: colors.lilac,
};

/** Tick marks in minutes after the start of the night, with their labels. */
const TICKS: { atMinute: number; label: string }[] = [
  { atMinute: 92, label: '12 AM' },
  { atMinute: 212, label: '2 AM' },
  { atMinute: 332, label: '4 AM' },
  { atMinute: 452, label: '6 AM' },
];

interface SleepStageChartProps {
  segments: SleepSegment[];
  height?: number;
  startLabel: string;
  endLabel: string;
}

const VIEW_WIDTH = 320;

/** Step-line hypnogram: awake (top), light (middle), deep (bottom). */
export function SleepStageChart({
  segments,
  height = 150,
  startLabel,
  endLabel,
}: SleepStageChartProps) {
  const pad = 6;
  const total = segments.reduce((sum, s) => sum + s.minutes, 0);
  const usable = height - pad * 2;

  const yFor = (stage: SleepStage) => pad + (STAGE_LEVEL[stage] / 2) * usable;
  const xFor = (minute: number) => (minute / total) * VIEW_WIDTH;

  const drawn: { stage: SleepStage; d: string; riser: string | null }[] = [];
  let cursor = 0;
  let prevStage: SleepStage | null = null;
  for (const segment of segments) {
    const x0 = xFor(cursor);
    const x1 = xFor(cursor + segment.minutes);
    const y = yFor(segment.stage);
    drawn.push({
      stage: segment.stage,
      d: `M ${x0} ${y} L ${x1} ${y}`,
      riser: prevStage !== null ? `M ${x0} ${yFor(prevStage)} L ${x0} ${y}` : null,
    });
    cursor += segment.minutes;
    prevStage = segment.stage;
  }

  return (
    <View>
      <View style={styles.bounds}>
        <Text style={styles.boundText}>{startLabel}</Text>
        <Text style={styles.boundText}>{endLabel}</Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none">
        {TICKS.map((tick) => (
          <Line
            key={tick.label}
            x1={xFor(tick.atMinute)}
            x2={xFor(tick.atMinute)}
            y1={0}
            y2={height}
            stroke={colors.cardBorder}
            strokeWidth={1}
          />
        ))}
        {drawn.map((p, index) => (
          <React.Fragment key={index}>
            {p.riser ? <Path d={p.riser} stroke={colors.textFaint} strokeWidth={2} fill="none" /> : null}
            <Path d={p.d} stroke={STAGE_COLOR[p.stage]} strokeWidth={4} fill="none" />
          </React.Fragment>
        ))}
      </Svg>
      <View style={styles.axis}>
        {TICKS.map((tick) => (
          <Text key={tick.label} style={styles.axisLabel}>
            {tick.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  bounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  boundText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
