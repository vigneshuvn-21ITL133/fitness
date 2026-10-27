import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { SLEEP_SEGMENTS, WORK_LIFE } from '@/data/mock';
import { getBmiResult } from '@/domain/bmi';
import { computeInsights, type Insight as FitnessInsight } from '@/domain/insights';
import {
  latestBloodPressure,
  latestHeartRate,
  latestWeight,
} from '@/domain/healthState';
import { buildSuggestions, type Suggestion, type SuggestionKind } from '@/domain/suggestions';
import { effectiveSteps } from '@/domain/steps';
import { addDays, startOfDay, startOfWeek, toDateKey } from '@/lib/date';
import { useActivity } from '@/store/activity-store';
import { useHealth } from '@/store/health-store';
import { useMoods } from '@/store/mood-store';
import { colors, radius, spacing } from '@/theme';
import type { MoodKey, SleepSegment } from '@/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Insight {
  id: string;
  icon: IconName;
  color: string;
  title: string;
  body: string;
}

const POSITIVE: MoodKey[] = ['happy', 'love'];

const SUGGESTION_ICON: Record<SuggestionKind, IconName> = {
  activity: 'walk-outline',
  mood: 'happy-outline',
  heart: 'heart-outline',
  'blood-pressure': 'pulse-outline',
  weight: 'scale-outline',
};

export default function InsightsScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { getMood } = useMoods();

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];

    // Mood this week (Sun → today)
    const weekStart = startOfWeek(new Date());
    const today = startOfDay(new Date());
    const daysSoFar = Math.round((today.getTime() - weekStart.getTime()) / 86_400_000) + 1;
    const weekMoods = Array.from({ length: daysSoFar }, (_, i) => getMood(addDays(weekStart, i))).filter(
      (m): m is MoodKey => m !== undefined,
    );
    const positive = weekMoods.filter((m) => POSITIVE.includes(m)).length;
    if (weekMoods.length === 0) {
      list.push({
        id: 'mood-empty',
        icon: 'happy-outline',
        color: colors.textMuted,
        title: 'No moods logged this week',
        body: 'Tap today on the home screen or in Journal to start seeing trends.',
      });
    } else {
      const ratio = positive / weekMoods.length;
      list.push({
        id: 'mood-week',
        icon: 'happy-outline',
        color: colors.mint,
        title: `${positive} of ${weekMoods.length} logged days felt good`,
        body:
          ratio >= 0.6
            ? 'Your week is trending positive. Keep doing what is working.'
            : 'More low days than good ones so far. A short walk or a call with a friend can help reset.',
      });
    }

    // Sleep
    const asleepMinutes = SLEEP_SEGMENTS.filter((s: SleepSegment) => s.stage !== 'awake').reduce(
      (sum, s) => sum + s.minutes,
      0,
    );
    const asleepHours = asleepMinutes / 60;
    list.push({
      id: 'sleep-duration',
      icon: 'moon-outline',
      color: colors.lilac,
      title:
        asleepHours >= 7
          ? `Good sleep duration (${asleepHours.toFixed(1)}h)`
          : `Short night (${asleepHours.toFixed(1)}h)`,
      body:
        asleepHours >= 7
          ? 'Adults generally do best with 7–9 hours. You are inside that range.'
          : 'Aim for at least 7 hours. Try an earlier wind-down time tonight.',
    });

    // Work / life
    const overWork = WORK_LIFE.workHours - WORK_LIFE.workGoal;
    list.push({
      id: 'work-balance',
      icon: 'briefcase-outline',
      color: colors.yellow,
      title: overWork > 0 ? `${overWork.toFixed(1)}h over your work goal` : 'Work hours on track',
      body:
        overWork > 0
          ? 'Long days add up. Block a break before your next task to protect recovery time.'
          : `You have ${(WORK_LIFE.workGoal - WORK_LIFE.workHours).toFixed(1)}h left in your daily work goal.`,
    });

    return list;
  }, [getMood]);

  const { state: health } = useHealth();
  const { state: activity } = useActivity();
  const fitnessInsights = useMemo<FitnessInsight[]>(
    () =>
      computeInsights({
        steps: health.steps,
        stepGoal: health.stepGoal,
        sessions: activity.sessions,
        weights: health.weights,
        heartRate: health.heartRate,
        now: new Date(),
      }),
    [health.steps, health.stepGoal, health.weights, health.heartRate, activity.sessions],
  );
  const hasWeight = latestWeight(health.weights) !== null;

  const suggestions = useMemo<Suggestion[]>(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const daysSoFar = Math.round((startOfDay(now).getTime() - weekStart.getTime()) / 86_400_000) + 1;
    const moodsThisWeek = Array.from({ length: daysSoFar }, (_, i) => getMood(addDays(weekStart, i))).filter(
      (m): m is MoodKey => m !== undefined,
    );

    const weight = latestWeight(health.weights);
    const profile = health.profile;
    const bmi =
      weight && profile
        ? getBmiResult(weight.kg, profile.heightCm, profile.age)
        : null;

    const bp = latestBloodPressure(health.bloodPressure);
    const hr = latestHeartRate(health.heartRate);

    return buildSuggestions({
      stepsToday: effectiveSteps(health.steps[toDateKey(now)]),
      stepGoal: health.stepGoal,
      moodsThisWeek,
      latestBp: bp ? { systolic: bp.systolic, diastolic: bp.diastolic } : null,
      latestHeartRate: hr ? hr.bpm : null,
      bmiCategory: bmi && bmi.kind === 'adult' ? bmi.category : null,
    });
  }, [health, getMood]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>Based on your mood log, sleep and work hours.</Text>

      <View style={styles.list}>
        {insights.map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
          </Card>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Suggestions</Text>
      <Text style={styles.subtitle}>
        Built on this device from your own records. Suggestions are general, not medical advice.
      </Text>
      <View style={styles.list}>
        {suggestions.map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name={SUGGESTION_ICON[item.kind]} size={18} color={colors.mint} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.benefit}>Health benefit: {item.benefit}</Text>
            </View>
          </Card>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open health benefits"
        onPress={() => router.navigate('/benefits')}
        style={({ pressed }) => [styles.benefitsLink, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.benefitsLinkText}>Read more about health benefits</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.mint} />
      </Pressable>

      <Text style={styles.sectionTitle}>Fitness</Text>
      <Text style={styles.subtitle}>
        {hasWeight ? 'From your steps, walks and weight entries.' : 'From your steps and walks.'}
      </Text>
      <View style={styles.list}>
        {fitnessInsights.map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="walk-outline" size={18} color={colors.mint} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.period}>{item.period}</Text>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
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
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  benefit: {
    color: colors.mint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  benefitsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.lg,
  },
  benefitsLinkText: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.xxl,
  },
  period: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 6,
  },
});
