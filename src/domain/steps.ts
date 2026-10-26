import { toDateKey } from '@/lib/date';
import type { StepDay } from '@/types';

export const DEFAULT_STEP_GOAL = 10_000;
const DEFAULT_HEIGHT_CM = 170;
const DEFAULT_WEIGHT_KG = 70;

/**
 * Steps for a day. A manual entry overrides the sensor reading, so a user
 * can correct or supply counts when the sensor is unavailable.
 */
export function effectiveSteps(day: StepDay | undefined): number {
  if (!day) return 0;
  return day.manual ?? day.sensor ?? 0;
}

/** Progress toward the goal, clamped to 0..1. */
export function goalProgress(steps: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(Math.max(steps / goal, 0), 1);
}

/**
 * Rough distance estimate: stride length is about 41.5% of height.
 * Shown to the user as an estimate only.
 */
export function estimateDistanceKm(steps: number, heightCm: number = DEFAULT_HEIGHT_CM): number {
  const strideM = (heightCm * 0.415) / 100;
  return (steps * strideM) / 1000;
}

/**
 * Rough energy estimate in kcal: about 0.00053 kcal per kg per step.
 * Real energy use depends on pace, terrain and body composition.
 */
export function estimateCalories(steps: number, weightKg: number = DEFAULT_WEIGHT_KG): number {
  return Math.round(steps * weightKg * 0.00053);
}

/** Last `days` local days ending at `end`, oldest first. */
export function lastDays(end: Date, days: number): { key: string; date: Date }[] {
  const out: { key: string; date: Date }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    out.push({ key: toDateKey(d), date: d });
  }
  return out;
}

export function weeklySteps(
  steps: Record<string, StepDay>,
  end: Date,
  days = 7,
): { key: string; date: Date; count: number }[] {
  return lastDays(end, days).map(({ key, date }) => ({
    key,
    date,
    count: effectiveSteps(steps[key]),
  }));
}
