/**
 * Insights calculated from saved data. Each insight states its period and
 * data source. Nothing here is medical advice.
 */
import { sessionDayKey } from '@/domain/activity';
import { toDateKey } from '@/lib/date';
import { effectiveSteps, lastDays } from '@/domain/steps';
import type { ActivitySession, HeartRateEntry, StepDay, WeightEntry } from '@/types';

export interface Insight {
  id: string;
  title: string;
  body: string;
  /** What the insight covers, e.g. "Last 7 days vs previous 7". */
  period: string;
}

export interface InsightInputs {
  steps: Record<string, StepDay>;
  stepGoal: number;
  sessions: ActivitySession[];
  weights: WeightEntry[];
  heartRate: HeartRateEntry[];
  now: Date;
}

const MIN_WEEK_DAYS_WITH_DATA = 3;

function sumSteps(inputs: InsightInputs, days: { key: string }[]): { total: number; withData: number } {
  let total = 0;
  let withData = 0;
  for (const d of days) {
    const count = effectiveSteps(inputs.steps[d.key]);
    if (count > 0) withData++;
    total += count;
  }
  return { total, withData };
}

export function goalStreak(inputs: InsightInputs): number {
  // Start from today if the goal is already met, otherwise from yesterday.
  const days = lastDays(inputs.now, 60).reverse();
  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const met = effectiveSteps(inputs.steps[days[i].key]) >= inputs.stepGoal;
    if (met) {
      streak++;
    } else if (i === 0) {
      continue; // today not finished yet
    } else {
      break;
    }
  }
  return streak;
}

export function computeInsights(inputs: InsightInputs): Insight[] {
  const out: Insight[] = [];
  const last7 = lastDays(inputs.now, 7);
  const prev7 = lastDays(new Date(inputs.now.getFullYear(), inputs.now.getMonth(), inputs.now.getDate() - 7), 7);

  // Week over week
  const thisWeek = sumSteps(inputs, last7);
  const lastWeek = sumSteps(inputs, prev7);
  if (thisWeek.withData < MIN_WEEK_DAYS_WITH_DATA || lastWeek.withData < MIN_WEEK_DAYS_WITH_DATA) {
    out.push({
      id: 'wow',
      title: 'Week-over-week steps',
      body: `Log steps on at least ${MIN_WEEK_DAYS_WITH_DATA} days in each week to compare them.`,
      period: 'Last 7 days vs previous 7',
    });
  } else {
    const diff = thisWeek.total - lastWeek.total;
    const pct = lastWeek.total > 0 ? Math.round((diff / lastWeek.total) * 100) : 0;
    out.push({
      id: 'wow',
      title: diff >= 0 ? 'More steps than last week' : 'Fewer steps than last week',
      body: `${thisWeek.total.toLocaleString('en-US')} steps this week, ${diff >= 0 ? '+' : ''}${pct}% compared with ${lastWeek.total.toLocaleString('en-US')}.`,
      period: 'Last 7 days vs previous 7',
    });
  }

  // Today against yesterday
  const today = new Date(inputs.now.getFullYear(), inputs.now.getMonth(), inputs.now.getDate());
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const todaySteps = effectiveSteps(inputs.steps[toDateKey(today)]);
  const yesterdaySteps = effectiveSteps(inputs.steps[toDateKey(yesterday)]);
  if (yesterdaySteps > 0 && todaySteps > 0) {
    const diff = todaySteps - yesterdaySteps;
    out.push({
      id: 'today-vs-yesterday',
      title: diff >= 0 ? 'Ahead of yesterday' : 'Behind yesterday',
      body: `${todaySteps.toLocaleString('en-US')} steps so far today, ${diff >= 0 ? '+' : ''}${diff.toLocaleString('en-US')} compared with ${yesterdaySteps.toLocaleString('en-US')} yesterday.`,
      period: 'Today vs yesterday',
    });
  } else {
    out.push({
      id: 'today-vs-yesterday',
      title: 'Today vs yesterday',
      body: yesterdaySteps > 0
        ? 'Log steps today to compare them with yesterday.'
        : 'Log steps on two days in a row to compare them.',
      period: 'Today vs yesterday',
    });
  }

  // Seven-day average over days with data
  if (thisWeek.withData > 0) {
    const avg = Math.round(thisWeek.total / thisWeek.withData);
    out.push({
      id: 'avg7',
      title: '7-day average',
      body: `About ${avg.toLocaleString('en-US')} steps on days you logged steps (${thisWeek.withData} of 7 days).`,
      period: 'Last 7 days',
    });
  }

  // Goal streak
  const streak = goalStreak(inputs);
  out.push({
    id: 'streak',
    title: streak > 0 ? `${streak}-day goal streak` : 'No goal streak yet',
    body:
      streak > 0
        ? `You have reached your ${inputs.stepGoal.toLocaleString('en-US')}-step goal ${streak} day${streak === 1 ? '' : 's'} in a row.`
        : `Reach ${inputs.stepGoal.toLocaleString('en-US')} steps today to start a streak.`,
    period: 'Up to today',
  });

  // Weekly distance from sessions
  const weekKeys = new Set(last7.map((d) => d.key));
  const weekSessions = inputs.sessions.filter(
    (s) => s.status === 'completed' && weekKeys.has(sessionDayKey(s)),
  );
  const weekDistanceKm = weekSessions.reduce((sum, s) => sum + s.distanceM, 0) / 1000;
  out.push({
    id: 'week-distance',
    title: 'Distance this week',
    body:
      weekSessions.length > 0
        ? `${weekDistanceKm.toFixed(2)} km across ${weekSessions.length} recorded session${weekSessions.length === 1 ? '' : 's'}.`
        : 'No completed sessions this week. Record a walk on the Tracking screen.',
    period: 'Last 7 days, GPS sessions',
  });

  // Personal best session distance
  const best = inputs.sessions
    .filter((s) => s.status === 'completed' && s.distanceM > 0)
    .sort((a, b) => b.distanceM - a.distanceM)[0];
  if (best) {
    out.push({
      id: 'record',
      title: 'Longest recorded walk',
      body: `${(best.distanceM / 1000).toFixed(2)} km on ${new Date(best.startedAt).toLocaleDateString('en-GB')}.`,
      period: 'All recorded sessions',
    });
  }

  // Weight trend over 30 days
  const sinceMs = inputs.now.getTime() - 30 * 86_400_000;
  const recentWeights = inputs.weights
    .filter((w) => new Date(w.timestamp).getTime() >= sinceMs)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (recentWeights.length >= 2) {
    const change = recentWeights[recentWeights.length - 1].kg - recentWeights[0].kg;
    out.push({
      id: 'weight-trend',
      title: change < 0 ? 'Weight is trending down' : change > 0 ? 'Weight is trending up' : 'Weight is steady',
      body: `${change >= 0 ? '+' : ''}${change.toFixed(1)} kg between your first and latest entry in the last 30 days.`,
      period: 'Last 30 days',
    });
  } else {
    out.push({
      id: 'weight-trend',
      title: 'Weight trend',
      body: 'Add at least two weight entries in 30 days to see a trend.',
      period: 'Last 30 days',
    });
  }

  // Heart-rate trend, only from real readings
  const weekMs = 7 * 86_400_000;
  const nowMs = inputs.now.getTime();
  const hrThis = inputs.heartRate.filter((h) => {
    const t = new Date(h.timestamp).getTime();
    return t > nowMs - weekMs && t <= nowMs;
  });
  const hrPrev = inputs.heartRate.filter((h) => {
    const t = new Date(h.timestamp).getTime();
    return t > nowMs - 2 * weekMs && t <= nowMs - weekMs;
  });
  if (hrThis.length >= MIN_WEEK_DAYS_WITH_DATA && hrPrev.length >= MIN_WEEK_DAYS_WITH_DATA) {
    const avgThis = hrThis.reduce((sum, h) => sum + h.bpm, 0) / hrThis.length;
    const avgPrev = hrPrev.reduce((sum, h) => sum + h.bpm, 0) / hrPrev.length;
    const diff = Math.round(avgThis - avgPrev);
    out.push({
      id: 'hr-trend',
      title: diff === 0 ? 'Heart rate steady' : diff < 0 ? 'Average heart rate is lower' : 'Average heart rate is higher',
      body: `Manual readings average ${Math.round(avgThis)} bpm this week and ${Math.round(avgPrev)} bpm last week. Readings are not a diagnosis.`,
      period: 'Last 7 days vs previous 7 (manual readings)',
    });
  } else {
    out.push({
      id: 'hr-trend',
      title: 'Heart-rate trend',
      body: `Add at least ${MIN_WEEK_DAYS_WITH_DATA} manual readings in each of the last two weeks to see a trend.`,
      period: 'Last 7 days vs previous 7 (manual readings)',
    });
  }

  // Goal suggestion
  if (thisWeek.withData >= MIN_WEEK_DAYS_WITH_DATA) {
    const avg = thisWeek.total / thisWeek.withData;
    if (avg >= inputs.stepGoal) {
      out.push({
        id: 'goal',
        title: 'Consider a higher goal',
        body: 'Your average is above your goal. You could raise it in Steps if you want a new target.',
        period: 'Last 7 days',
      });
    } else if (avg < inputs.stepGoal * 0.5) {
      out.push({
        id: 'goal',
        title: 'A smaller daily step goal may help',
        body: 'Your average is under half your goal. A reachable target can make progress easier to keep up.',
        period: 'Last 7 days',
      });
    }
  }

  return out;
}
