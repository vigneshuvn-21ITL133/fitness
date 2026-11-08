/**
 * In-app reminders built from the user's own records. These are not phone push
 * notifications: they show on the Notifications screen and set the bell badge.
 * Pure functions only.
 */
import { effectiveSteps } from '@/domain/steps';
import type { MoodMap } from '@/domain/mood';
import { toDateKey } from '@/lib/date';
import type { HealthState } from '@/types';

export interface Reminder {
  id: string;
  title: string;
  body: string;
  /** Screen to open when the reminder is tapped, if any. */
  route?: '/tracking' | '/weight' | '/(tabs)/journal';
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function remindersFor(state: HealthState, moods: MoodMap, now: Date): Reminder[] {
  const list: Reminder[] = [];
  const todayKey = toDateKey(now);

  if (moods[todayKey] === undefined) {
    list.push({
      id: 'mood-today',
      title: "Log today's mood",
      body: 'Tap today on the home screen to record how you feel.',
      route: '/(tabs)/journal',
    });
  }

  const steps = effectiveSteps(state.steps[todayKey]);
  if (state.stepGoal > 0 && steps < state.stepGoal && now.getHours() >= 18) {
    const left = state.stepGoal - steps;
    list.push({
      id: 'steps-behind',
      title: 'Steps behind goal',
      body: `${left.toLocaleString('en-US')} steps to go today. A short walk will close the gap.`,
      route: '/tracking',
    });
  }

  const weekAgo = now.getTime() - 7 * DAY_MS;
  const weighedThisWeek = state.weights.some((w) => new Date(w.timestamp).getTime() >= weekAgo);
  if (!weighedThisWeek) {
    list.push({
      id: 'weight-week',
      title: 'Log your weight',
      body: 'You have not logged a weight in the last 7 days.',
      route: '/weight',
    });
  }

  return list;
}
