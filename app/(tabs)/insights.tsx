import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { SLEEP_SEGMENTS, WORK_LIFE } from '@/data/mock';
import { addDays, startOfDay, startOfWeek } from '@/lib/date';
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

export default function InsightsScreen() {
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
        body: 'Tap a day on the home screen or pick one in Journal to start seeing trends.',
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
