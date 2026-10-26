import { describe, expect, test } from 'bun:test';

import { computeInsights, type InsightInputs } from './insights';

const now = new Date(2026, 9, 20, 12, 0);

function inputs(overrides: Partial<InsightInputs> = {}): InsightInputs {
  return { steps: {}, stepGoal: 10_000, sessions: [], weights: [], now, ...overrides };
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
