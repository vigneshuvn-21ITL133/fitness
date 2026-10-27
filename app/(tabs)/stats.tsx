import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { MoodFace } from '@/components/MoodFace';
import { ProgressBar } from '@/components/ProgressBar';
import { RingChart } from '@/components/RingChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectMenu } from '@/components/SelectMenu';
import { HEALTH_RINGS, HEALTH_STATS, WORK_LIFE } from '@/data/mock';
import { addDays, formatDayMonth, startOfDay, WEEKDAY_SHORT } from '@/lib/date';
import { useHealth } from '@/store/health-store';
import { useMoods } from '@/store/mood-store';
import { colors, radius, spacing } from '@/theme';

const MOOD_RANGES = ['Week', 'Fortnight'] as const;
type MoodRange = (typeof MOOD_RANGES)[number];
const MOOD_RANGE_DAYS: Record<MoodRange, number> = { Week: 7, Fortnight: 14 };

const RING_COLORS = [colors.mint, colors.yellow, colors.lilac] as const;

export default function HealthOverviewScreen() {
  const styles = useThemedStyles(makeStyles);
  const { getMood } = useMoods();
  const { state: health } = useHealth();
  const [moodRange, setMoodRange] = useState<MoodRange>('Week');

  const moodDays = useMemo(() => {
    const today = startOfDay(new Date());
    const count = MOOD_RANGE_DAYS[moodRange];
    return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)));
  }, [moodRange]);

  const workPct = WORK_LIFE.workHours / WORK_LIFE.workGoal;
  const sleepPct = WORK_LIFE.sleepHours / WORK_LIFE.sleepGoal;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Health Overview" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.ringWrap}>
          <RingChart
            size={260}
            strokeWidth={24}
            gap={8}
            rings={HEALTH_RINGS.map((ring, i) => ({ progress: ring.progress, color: RING_COLORS[i] }))}
          />
        </View>

        <View style={styles.statRow}>
          <Stat value={`${HEALTH_STATS.noStressDays}`} unit="days" label="No Stress" color={colors.mint} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open sleep overview"
            onPress={() => router.push('/sleep')}
            style={styles.statPressable}
          >
            <Stat
              value={`${HEALTH_STATS.sleepQualityPercent}`}
              unit="%"
              label="Sleep Quality"
              color={colors.yellow}
            />
          </Pressable>
          <Stat value={`${HEALTH_STATS.meditationDays}`} unit="days" label="Meditation" color={colors.lilac} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open fitness tracking"
          onPress={() => router.navigate('/fitness')}
        >
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fitness tracking</Text>
              <Text style={styles.linkText}>
                {health.profile ? 'Open' : 'Set up'}
              </Text>
            </View>
            <Text style={styles.linkBody}>
              Steps, weight, blood pressure and BMI in one place.
            </Text>
          </Card>
        </Pressable>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mood tracker</Text>
            <SelectMenu value={moodRange} options={MOOD_RANGES} onChange={setMoodRange} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
            {moodDays.map((day) => {
              const mood = getMood(day);
              return (
                <View key={day.toISOString()} style={styles.moodColumn}>
                  <MoodFace mood={mood} size={30} />
                  <View style={styles.moodStem} />
                  <Text style={styles.moodDate}>{formatDayMonth(day)}</Text>
                  <Text style={styles.moodWeekday}>{WEEKDAY_SHORT[day.getDay()]}</Text>
                </View>
              );
            })}
          </ScrollView>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Work / Life Balance</Text>
            <View style={styles.staticPill}>
              <Text style={styles.staticPillText}>Today</Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.lg }}>
            <ProgressBar
              label="Work"
              valueLabel={`${WORK_LIFE.workHours}h`}
              progress={workPct}
              color={colors.yellow}
            />
            <ProgressBar
              label="Sleep"
              valueLabel={`${WORK_LIFE.sleepHours}h`}
              progress={sleepPct}
              color={colors.mint}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function Stat({
  value,
  unit,
  label,
  color,
}: {
  value: string;
  unit: string;
  label: string;
  color: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
      <View style={styles.statLabelRow}>
        <View style={[styles.statDot, { backgroundColor: color }]} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
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
    paddingBottom: 120,
    gap: spacing.lg,
  },
  ringWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  statPressable: {
    flex: 1,
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sectionCard: {
    paddingVertical: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  moodRow: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  moodColumn: {
    alignItems: 'center',
    width: 48,
  },
  moodStem: {
    width: 1,
    height: 22,
    borderLeftWidth: 1,
    borderLeftColor: colors.textFaint,
    borderStyle: 'dashed',
    marginVertical: 6,
  },
  moodDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
  moodWeekday: {
    color: colors.textFaint,
    fontSize: 10,
    marginTop: 2,
  },
  linkText: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: '600',
  },
  linkBody: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  staticPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  staticPillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
});
