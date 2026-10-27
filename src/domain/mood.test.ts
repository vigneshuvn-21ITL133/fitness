import { describe, expect, test } from 'bun:test';

import { canRecordMood, moodGroups } from '@/domain/mood';

describe('canRecordMood', () => {
  const now = new Date(2026, 9, 27, 18, 0); // 27 Oct 2026, evening

  test('allows today', () => {
    expect(canRecordMood(new Date(2026, 9, 27, 0, 0), now)).toBe(true);
  });

  test('allows later days', () => {
    expect(canRecordMood(new Date(2026, 9, 28), now)).toBe(true);
  });

  test('refuses past days', () => {
    expect(canRecordMood(new Date(2026, 9, 26), now)).toBe(false);
  });
});

describe('moodGroups', () => {
  test('returns nothing when no moods are logged', () => {
    expect(moodGroups({})).toEqual({ total: 0, groups: [] });
  });

  test('groups loved with happy and leaves out empty groups', () => {
    const result = moodGroups({ '2026-10-27': 'happy', '2026-10-28': 'love', '2026-10-29': 'sad' });
    expect(result.total).toBe(3);
    expect(result.groups.map((g) => g.key)).toEqual(['happy', 'sad']);
    expect(result.groups[0]).toMatchObject({ count: 2 });
    expect(result.groups[0].share).toBeCloseTo(2 / 3);
  });

  test('keeps okay and angry as their own groups', () => {
    const result = moodGroups({ a: 'neutral', b: 'angry' });
    expect(result.groups.map((g) => g.key)).toEqual(['angry', 'okay']);
  });
});
