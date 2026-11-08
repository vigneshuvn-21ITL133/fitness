import { describe, expect, test } from 'bun:test';

import { remindersFor } from '@/domain/notifications';
import { initialHealthState } from '@/domain/healthState';
import { toDateKey } from '@/lib/date';

const evening = new Date(2026, 10, 8, 20, 0);
const noon = new Date(2026, 10, 8, 12, 0);

function withWeight(daysAgo: number) {
  const state = initialHealthState();
  const when = new Date(evening.getTime() - daysAgo * 86_400_000);
  return { ...state, weights: [{ id: 'w', timestamp: when.toISOString(), kg: 70 }] };
}

describe('remindersFor', () => {
  test('asks for today mood when none is logged', () => {
    const ids = remindersFor(withWeight(1), {}, noon).map((r) => r.id);
    expect(ids).toContain('mood-today');
  });

  test('clears the mood reminder once logged today', () => {
    const moods = { [toDateKey(noon)]: 'happy' as const };
    const ids = remindersFor(withWeight(1), moods, noon).map((r) => r.id);
    expect(ids).not.toContain('mood-today');
  });

  test('flags steps behind goal only in the evening', () => {
    const state = { ...withWeight(1), stepGoal: 10000, steps: {} };
    const moods = { [toDateKey(evening)]: 'happy' as const };
    expect(remindersFor(state, moods, noon).map((r) => r.id)).not.toContain('steps-behind');
    expect(remindersFor(state, moods, evening).map((r) => r.id)).toContain('steps-behind');
  });

  test('asks for a weight when none was logged in the last week', () => {
    const moods = { [toDateKey(noon)]: 'happy' as const };
    expect(remindersFor(withWeight(10), moods, noon).map((r) => r.id)).toContain('weight-week');
    expect(remindersFor(withWeight(2), moods, noon).map((r) => r.id)).not.toContain('weight-week');
  });
});
