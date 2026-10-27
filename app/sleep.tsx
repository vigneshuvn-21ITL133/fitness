import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ArcGauge } from '@/components/ArcGauge';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SelectMenu } from '@/components/SelectMenu';
import { SleepStageChart } from '@/components/SleepStageChart';
import {
  SLEEP_END_LABEL,
  SLEEP_META,
  SLEEP_SCORE,
  SLEEP_SEGMENTS,
  SLEEP_START_LABEL,
} from '@/data/mock';
import { colors, spacing } from '@/theme';
import type { RangeKey, SleepStage } from '@/types';

const RANGES = ['Today', 'Week', 'Month', 'Year'] as const;
const STAGE_RANGES = ['Today', 'Week', 'Month'] as const;

const STAGE_META: { stage: SleepStage; label: string; color: string }[] = [
  { stage: 'awake', label: 'Awake', color: colors.mint },
  { stage: 'light', label: 'Light', color: colors.yellow },
  { stage: 'deep', label: 'Deep', color: colors.lilac },
];

export default function SleepScreen() {
  const styles = useThemedStyles(makeStyles);
  const [range, setRange] = useState<RangeKey>('Today');
  const [stageRange, setStageRange] = useState<'Today' | 'Week' | 'Month'>('Today');

  const totals = useMemo(() => {
    const byStage: Record<SleepStage, number> = { awake: 0, light: 0, deep: 0 };
    for (const segment of SLEEP_SEGMENTS) byStage[segment.stage] += segment.minutes;
    const inBed = byStage.awake + byStage.light + byStage.deep;
    const asleep = byStage.light + byStage.deep;
    return { byStage, inBed, asleep };
  }, []);

  const asleepHours = Math.floor(totals.asleep / 60);
  const asleepMinutes = totals.asleep % 60;
  const showSampleNote = range !== 'Today' || stageRange !== 'Today';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Sleep Overview" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentedControl options={RANGES} value={range} onChange={setRange} />

        <View style={styles.gaugeWrap}>
          <ArcGauge size={250} progress={SLEEP_SCORE / 100} strokeWidth={26}>
            <View style={styles.gaugeCenter}>
              <Text style={styles.score}>
                {SLEEP_SCORE}
                <Text style={styles.scoreUnit}>%</Text>
              </Text>
              <View style={styles.scoreRow}>
                <Ionicons name="bed-outline" size={16} color={colors.text} />
                <Text style={styles.scoreLabel}>Score</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.text} />
              </View>
            </View>
          </ArcGauge>
          <Ionicons name="star" size={8} color={colors.mint} style={[styles.star, { top: 8, left: 42 }]} />
          <Ionicons name="star" size={6} color={colors.mint} style={[styles.star, { top: 22, left: 30 }]} />
        </View>

        <View style={styles.statRow}>
          <SleepStat value={`${asleepHours}h ${asleepMinutes}m`} label="Sleep Time" />
          <SleepStat value={`${SLEEP_META.irregularDays}`} unit="days" label="Irregular" />
          <SleepStat value={`${SLEEP_META.restingHr}`} unit="BPM" label="Resting HR" />
        </View>

        <Card style={styles.stagesCard}>
          <View style={styles.stagesHeader}>
            <Text style={styles.stagesTitle}>Sleep Stages</Text>
            <SelectMenu value={stageRange} options={STAGE_RANGES} onChange={setStageRange} />
          </View>

          <View style={styles.stageStats}>
            {STAGE_META.map((item) => {
              const pct = totals.inBed > 0 ? Math.round((totals.byStage[item.stage] / totals.inBed) * 100) : 0;
              return (
                <View key={item.stage} style={styles.stageStat}>
                  <Text style={styles.stagePct}>{pct}%</Text>
                  <View style={styles.stageLabelRow}>
                    <View style={[styles.stageDot, { backgroundColor: item.color }]} />
                    <Text style={styles.stageLabel}>{item.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.chartWrap}>
            <SleepStageChart
              segments={SLEEP_SEGMENTS}
              startLabel={SLEEP_START_LABEL}
              endLabel={SLEEP_END_LABEL}
            />
          </View>

          {showSampleNote ? (
            <Text style={styles.note}>
              Sample data for this range. Live history appears once a sleep source is connected.
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </View>
  );
}

function SleepStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  gaugeWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  gaugeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    color: colors.text,
    fontSize: 48,
    fontWeight: '700',
  },
  scoreUnit: {
    fontSize: 22,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  scoreLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  star: {
    position: 'absolute',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  stagesCard: {
    paddingVertical: spacing.lg,
  },
  stagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stagesTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  stageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  stageStat: {
    alignItems: 'center',
  },
  stagePct: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  stageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stageLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chartWrap: {
    marginTop: spacing.sm,
  },
  note: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
