import { describe, expect, test } from 'bun:test';

import { computeInsights, type InsightInputs } from './insights';

const now = new Date(2026, 9, 20, 12, 0);

function inputs(overrides: Partial<InsightInputs> = {}): InsightInputs {
  return { steps: {}, stepGoal: 10_000, sessions: [], weights: [], heartRate: [], now, ...overrides };
}

describe('computeInsights', () => {
  test('with no data it asks for more steps and weights rather than inventing trends', () => {
    const list = computeInsights(inputs());
    const ids = list.map((i) => i.id);
    expect(ids).toContain('wow');
    expect(list.find((i) => i.id === 'wow')?.body).toMatch(/at least 3 days/);
  });

  test('every insight states the period it covers', () => {
    for (const insight of computeInsights(inputs())) {
      expect(insight.period.length).toBeGreaterThan(0);
    }
  });

  test('a single weight entry does not produce a trend', () => {
    const list = computeInsights(
      inputs({ weights: [{ id: 'w', timestamp: now.toISOString(), kg: 70 }] }),
    );
    expect(list.some((i) => i.id === 'weight-trend' && /down|up|stable/i.test(i.title))).toBe(false);
  });
});

describe('insights from steps and heart rate', () => {
  test('compares today with yesterday when both have steps', () => {
    const today = new Date(2026, 9, 20, 12, 0);
    const steps = {
      '2026-10-20': { manual: 6000 },
      '2026-10-19': { manual: 4000 },
    };
    const insight = computeInsights(inputs({ now: today, steps })).find((i) => i.id === 'today-vs-yesterday');
    expect(insight?.title).toBe('Ahead of yesterday');
    expect(insight?.body).toContain('+2,000');
  });

  test('asks for more data instead of comparing when yesterday is empty', () => {
    const today = new Date(2026, 9, 20, 12, 0);
    const insight = computeInsights(inputs({ now: today, steps: { '2026-10-20': { manual: 3000 } } })).find(
      (i) => i.id === 'today-vs-yesterday',
    );
    expect(insight?.title).toBe('Today vs yesterday');
  });

  test('heart-rate trend needs readings in both weeks', () => {
    const now = new Date(2026, 9, 20, 12, 0).getTime();
    const reading = (daysAgo: number, bpm: number) => ({
      id: `${daysAgo}-${bpm}`,
      timestamp: new Date(now - daysAgo * 86_400_000).toISOString(),
      bpm,
      source: 'manual' as const,
    });
    const thin = computeInsights(inputs({ now: new Date(now), heartRate: [reading(1, 70)] }));
    expect(thin.find((i) => i.id === 'hr-trend')?.title).toBe('Heart-rate trend');

    const enough = [reading(1, 70), reading(2, 72), reading(3, 74), reading(9, 80), reading(10, 82), reading(11, 84)];
    const full = computeInsights(inputs({ now: new Date(now), heartRate: enough }));
    const trend = full.find((i) => i.id === 'hr-trend');
    expect(trend?.title).toBe('Average heart rate is lower');
    expect(trend?.body).toContain('72 bpm this week');
  });
});
