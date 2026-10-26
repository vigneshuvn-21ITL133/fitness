import { describe, expect, test } from 'bun:test';

import { addDays, relativeDayLabel, startOfWeek, toDateKey } from './date';

describe('date helpers', () => {
  test('startOfWeek returns the Sunday on or before the date', () => {
    // Monday 26 Oct 2026 → Sunday 25 Oct 2026
    const monday = new Date(2026, 9, 26, 15, 30);
    const sunday = startOfWeek(monday);
    expect(toDateKey(sunday)).toBe('2026-10-25');
    expect(sunday.getDay()).toBe(0);
  });

  test('addDays crosses month boundaries', () => {
    expect(toDateKey(addDays(new Date(2026, 9, 31), 1))).toBe('2026-11-01');
    expect(toDateKey(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });

  test('toDateKey zero-pads month and day', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('relativeDayLabel labels today and yesterday', () => {
    const now = new Date(2026, 9, 26, 9, 0);
    expect(relativeDayLabel(new Date(2026, 9, 26), now)).toBe('Today');
    expect(relativeDayLabel(new Date(2026, 9, 25), now)).toBe('Yesterday');
    expect(relativeDayLabel(new Date(2026, 9, 20), now)).toBe('Tue 20 Oct');
  });
});
