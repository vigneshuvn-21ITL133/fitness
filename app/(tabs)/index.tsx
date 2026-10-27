import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { GrowthBars } from '@/components/GrowthBars';
import { MoodFace } from '@/components/MoodFace';
import { WeightRuler } from '@/components/WeightRuler';
import {
  FREUD_SCORE,
  GROWTH,
  HAPPY_MINUTES,
  MOOD_SHARE,
  WEIGHT,
} from '@/data/mock';
import { kgToDisplay, weightUnitLabel } from '@/domain/units';
import { addDays, isSameDay, startOfDay, startOfWeek, toDateKey, WEEKDAY_SHORT } from '@/lib/date';
import { latestWeight } from '@/domain/healthState';
import { DEFAULT_WEIGHT_KG, sessionDayKey, sessionSteps } from '@/domain/activity';
import { sessionsNewestFirst } from '@/domain/activityState';
import { formatDuration, formatKm, formatSessionDate } from '@/domain/format';
import { effectiveSteps, estimateCalories, estimateDistanceKm, goalProgress } from '@/domain/steps';
import { useActivity } from '@/store/activity-store';
import { useHealth } from '@/store/health-store';
import { useMoods } from '@/store/mood-store';
import { colors, radius, spacing } from '@/theme';
import type { MoodKey } from '@/types';

/** Tap cycle for a day's mood: none → happy → sad → angry → love → okay → none. */
const MOOD_CYCLE: (MoodKey | undefined)[] = [undefined, 'happy', 'sad', 'angry', 'love', 'neutral'];

const DOT_GRID_COLUMNS = 7;
const DOT_GRID_CELLS = 42;

export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { getMood, setMood, clearMood } = useMoods();
  const { state: health } = useHealth();
  const latest = latestWeight(health.weights);
  const displayWeightKg = latest ? latest.kg : WEIGHT.current;
  const displayUnits = health.profile?.units ?? 'metric';
  const greetingName = health.profile?.name?.trim() ?? '';
  const personalInitial = greetingName ? greetingName[0].toUpperCase() : '?';
  const [selected, setSelected] = useState<Date>(() => startOfDay(new Date()));
  const [notifications, setNotifications] = useState(3);

  const weekDays = useMemo(() => {
    const sunday = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  }, []);

  const cycleMood = (date: Date) => {
    const current = getMood(date);
    const index = MOOD_CYCLE.indexOf(current);
    const next = MOOD_CYCLE[(index + 1) % MOOD_CYCLE.length];
    if (next === undefined) {
      clearMood(date);
    } else {
      setMood(date, next);
    }
  };

  const freudLit = Math.round((FREUD_SCORE.value / FREUD_SCORE.max) * DOT_GRID_CELLS);

  const { state: activity } = useActivity();
  const todayKey = toDateKey(new Date());
  const todaySteps = effectiveSteps(health.steps[todayKey]);
  const stepGoal = health.stepGoal;
  const todayWeightKg = latest ? latest.kg : DEFAULT_WEIGHT_KG;
  const todaySessions = sessionsNewestFirst(activity).filter((s) => sessionDayKey(s) === todayKey);
  const todayActiveMs = todaySessions.reduce((sum, s) => sum + s.activeMs, 0);
  const todayDistanceM = todaySessions.reduce((sum, s) => sum + s.distanceM, 0);
  const latestSession = sessionsNewestFirst(activity)[0] ?? null;
  const sensorPending = health.steps[todayKey] === undefined && todaySessions.length === 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        {health.profile?.avatarUri ? (
          <Image source={{ uri: health.profile.avatarUri }} style={styles.avatarImage} accessibilityLabel="Profile photo" />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{personalInitial}</Text>
          </View>
        )}
        <Pressable
          accessibilityLabel={`${notifications} notifications`}
          onPress={() => setNotifications(0)}
          style={styles.bellButton}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {notifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifications}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.hello}>{greetingName ? `Hello, ${greetingName}` : 'Hello'}</Text>
        <Text style={styles.title}>How&apos;re You Today?</Text>
      </View>

      {/* Week strip */}
      <View style={styles.weekRow}>
        {weekDays.map((day) => {
          const active = isSameDay(day, selected);
          const mood = getMood(day);
          return (
            <View key={day.toISOString()} style={styles.dayColumn}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${WEEKDAY_SHORT[day.getDay()]} ${day.getDate()}`}
                onPress={() => setSelected(day)}
                style={[styles.dayCell, active && styles.dayCellActive]}
              >
                <Text style={[styles.dayName, active && styles.dayNameActive]}>
                  {WEEKDAY_SHORT[day.getDay()]}
                </Text>
                <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>
                  {day.getDate()}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mood for ${WEEKDAY_SHORT[day.getDay()]}`}
                onPress={() => cycleMood(day)}
                hitSlop={6}
                style={styles.moodTap}
              >
                <MoodFace mood={mood} size={28} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Fitness summary */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open fitness tracking"
        onPress={() => router.push('/fitness')}
        style={styles.fitnessWrap}
      >
        <Card style={styles.fitnessCard}>
          <View style={styles.rowBetween}>
            <View style={styles.cardHeader}>
              <Ionicons name="walk-outline" size={16} color={colors.text} />
              <Text style={styles.cardTitle}>Today&apos;s movement</Text>
            </View>
            <Text style={styles.meta}>{Math.round(goalProgress(todaySteps, stepGoal) * 100)}% of goal</Text>
          </View>
          <Text style={styles.bigValue}>
            {todaySteps.toLocaleString('en-US')}
            <Text style={styles.bigValueMuted}> / {stepGoal.toLocaleString('en-US')} steps</Text>
          </Text>
          <View style={styles.summaryRow}>
            <SummaryStat value={`${estimateCalories(todaySteps, todayWeightKg)} kcal`} label="Est. steps energy" />
            <SummaryStat
              value={formatKm(todayDistanceM > 0 ? todayDistanceM : estimateDistanceKm(todaySteps, health.profile?.heightCm) * 1000)}
              label="Distance"
            />
            <SummaryStat value={todayActiveMs > 0 ? formatDuration(todayActiveMs) : '—'} label="Active today" />
          </View>
          <Text style={styles.meta}>
            {latestSession
              ? `Last walk ${formatSessionDate(latestSession.startedAt)} · ${sessionSteps(latestSession).toLocaleString('en-US')} steps`
              : 'No tracked walks yet'}
          </Text>
          {sensorPending ? (
            <Text style={styles.meta}>Steps appear here once the step sensor is allowed or entered by hand.</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a tracked walk"
            onPress={() => router.push('/tracking')}
            style={styles.trackButton}
          >
            <Ionicons name="play" size={14} color={colors.onAccent} />
            <Text style={styles.trackButtonText}>Track a walk</Text>
          </Pressable>
        </Card>
      </Pressable>

      {/* Dashboard grid */}
      <View style={styles.grid}>
        <View style={styles.column}>
          <Card tone="green" style={styles.freudCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="cloud-outline" size={16} color={colors.text} />
              <Text style={styles.cardTitle}>Freud Score</Text>
              <Text style={styles.sampleTag}>Sample</Text>
            </View>
            <Text style={styles.bigValue}>
              {FREUD_SCORE.value}
              <Text style={styles.bigValueMuted}>/{FREUD_SCORE.max}</Text>
            </Text>
            <View style={styles.dotGrid}>
              {Array.from({ length: DOT_GRID_CELLS / DOT_GRID_COLUMNS }, (_, row) => (
                <View key={row} style={styles.dotRow}>
                  {Array.from({ length: DOT_GRID_COLUMNS }, (_, col) => {
                    const index = row * DOT_GRID_COLUMNS + col;
                    const lit = index < freudLit;
                    return (
                      <View
                        key={col}
                        style={[
                          styles.dot,
                          { backgroundColor: lit ? colors.white : 'rgba(255,255,255,0.14)' },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.growthCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up" size={16} color={colors.text} />
              <Text style={styles.cardTitle}>Growth</Text>
              <Text style={styles.sampleTag}>Sample</Text>
            </View>
            <Text style={[styles.smallValue, { marginTop: spacing.xs }]}>
              {GROWTH.percent}
              <Text style={styles.smallValueUnit}>%</Text>
            </Text>
            <View style={{ marginTop: spacing.md }}>
              <GrowthBars items={GROWTH.months} />
            </View>
          </Card>
        </View>

        <View style={styles.column}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open health overview"
            onPress={() => router.navigate('/stats')}
          >
            <Card style={styles.healthCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="pulse-outline" size={16} color={colors.text} />
                <Text style={styles.cardTitle}>Health overview</Text>
              </View>
              <View style={styles.weightRow}>
                <Text style={styles.smallValue}>
                  {kgToDisplay(displayWeightKg, displayUnits).toFixed(1)}
                </Text>
                <Text style={styles.weightUnit}>
                  {weightUnitLabel(displayUnits)} weight
                </Text>
              </View>
              <WeightRuler
                value={Math.round(kgToDisplay(displayWeightKg, displayUnits))}
                min={displayUnits === 'metric' ? WEIGHT.rulerMin : Math.round(kgToDisplay(WEIGHT.rulerMin, 'imperial'))}
                max={displayUnits === 'metric' ? WEIGHT.rulerMax : Math.round(kgToDisplay(WEIGHT.rulerMax, 'imperial'))}
                step={1}
                unit={` ${weightUnitLabel(displayUnits)}`}
              />
            </Card>
          </Pressable>

          <Card style={styles.moodCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="happy-outline" size={16} color={colors.text} />
              <Text style={styles.cardTitle}>Mood Statistic</Text>
              <Text style={styles.sampleTag}>Sample</Text>
            </View>
            <View style={styles.donutWrap}>
              <DonutChart
                size={132}
                thickness={14}
                segments={[
                  { value: MOOD_SHARE.happy, color: colors.mint },
                  { value: MOOD_SHARE.sad, color: colors.yellow },
                  { value: MOOD_SHARE.angry, color: colors.lilac },
                ]}
              >
                <View style={styles.donutCenter}>
                  <Text style={styles.donutValue}>{HAPPY_MINUTES}</Text>
                  <Text style={styles.donutLabel}>Happy Minutes</Text>
                </View>
              </DonutChart>
            </View>
            <View style={styles.legend}>
              <LegendDot color={colors.mint} label={`Happy ${Math.round(MOOD_SHARE.happy * 100)}%`} />
              <LegendDot color={colors.yellow} label={`Sad ${Math.round(MOOD_SHARE.sad * 100)}%`} />
              <LegendDot color={colors.lilac} label={`Angry ${Math.round(MOOD_SHARE.angry * 100)}%`} />
            </View>
          </Card>
        </View>
      </View>
      <Text style={styles.sampleNote}>
        Freud score, growth and mood statistic are sample values. Steps, walks, weight and heart rate come from your saved records.
      </Text>
    </ScrollView>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  avatarImage: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.cardBorder },
  sampleNote: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: spacing.xl, textAlign: 'center' },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  avatarText: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 17,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 9,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  greeting: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  hello: {
    color: colors.textMuted,
    fontSize: 15,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xl,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayCell: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  dayCellActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  dayName: {
    color: colors.textMuted,
    fontSize: 11,
  },
  dayNameActive: {
    color: colors.onAccent,
    fontWeight: '600',
  },
  dayNumber: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  dayNumberActive: {
    color: colors.onAccent,
  },
  moodTap: {
    marginTop: 8,
    padding: 2,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  freudCard: {
    height: 232,
  },
  growthCard: {
    height: 184,
  },
  healthCard: {
    height: 170,
  },
  moodCard: {
    height: 262,
  },
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sampleTag: {
    color: colors.textFaint,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 'auto',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bigValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  bigValueMuted: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '500',
  },
  dotGrid: {
    marginTop: spacing.lg,
    gap: 7,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  smallValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  smallValueUnit: {
    fontSize: 14,
    color: colors.textMuted,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: spacing.md,
  },
  weightUnit: {
    color: colors.textMuted,
    fontSize: 12,
  },
  donutWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  donutCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  donutLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  fitnessWrap: {
    marginTop: spacing.xl,
  },
  fitnessCard: {
    gap: spacing.sm,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  summaryStat: {
    flex: 1,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  trackButton: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.mint,
  },
  trackButtonText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '700',
  },
});
