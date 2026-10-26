import { describe, expect, test } from 'bun:test';

import {
  effectiveSteps,
  estimateCalories,
  estimateDistanceKm,
  goalProgress,
  lastDays,
  weeklySteps,
} from './steps';

describe('effectiveSteps', () => {
  test('uses the sensor value when there is no manual entry', () => {
    expect(effectiveSteps({ sensor: 4200 })).toBe(4200);
  });

  test('manual entry overrides the sensor', () => {
    expect(effectiveSteps({ sensor: 4200, manual: 6000 })).toBe(6000);
  });

  test('is zero for an unknown day', () => {
    expect(effectiveSteps(undefined)).toBe(0);
  });
});

describe('goalProgress', () => {
  test('is a fraction of the goal, clamped to 0..1', () => {
    expect(goalProgress(5000, 10000)).toBe(0.5);
    expect(goalProgress(15000, 10000)).toBe(1);
    expect(goalProgress(0, 10000)).toBe(0);
  });

  test('guards against a zero goal', () => {
    expect(goalProgress(100, 0)).toBe(0);
  });
});

describe('estimates', () => {
  test('distance uses a stride of 41.5% of height', () => {
    // 10,000 steps at 170 cm → stride 0.7055 m → 7.055 km
    expect(estimateDistanceKm(10_000, 170)).toBeCloseTo(7.055, 3);
  });

  test('calories scale with steps and body weight', () => {
    expect(estimateCalories(10_000, 70)).toBe(371);
    expect(estimateCalories(0, 70)).toBe(0);
  });
});

describe('weeklySteps', () => {
  test('returns seven days ending today, oldest first', () => {
    const end = new Date(2026, 9, 26);
    const week = weeklySteps({ '2026-10-26': { manual: 9000 } }, end, 7);
    expect(week).toHaveLength(7);
    expect(week[0].key).toBe('2026-10-20');
    expect(week[6].key).toBe('2026-10-26');
    expect(week[6].count).toBe(9000);
    expect(week[0].count).toBe(0);
  });

  test('lastDays crosses a month boundary correctly', () => {
    const keys = lastDays(new Date(2026, 10, 2), 3).map((d) => d.key);
    expect(keys).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
  });
});
