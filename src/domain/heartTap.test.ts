import { describe, expect, test } from 'bun:test';

import { tapsToBpm, validateTapCount } from '@/domain/heartTap';

describe('tapsToBpm', () => {
  test('scales a 15 second tap count to beats per minute', () => {
    expect(tapsToBpm(18)).toBe(72);
    expect(tapsToBpm(17)).toBe(68);
    expect(tapsToBpm(10)).toBe(40);
  });

  test('rounds to a whole beat per minute', () => {
    expect(tapsToBpm(17.5)).toBe(70);
    expect(tapsToBpm(1)).toBe(4);
  });

  test('returns 0 for invalid counts', () => {
    expect(tapsToBpm(-3)).toBe(0);
    expect(tapsToBpm(Number.NaN)).toBe(0);
  });
});

describe('validateTapCount', () => {
  test('accepts counts inside the heart-rate range', () => {
    const result = validateTapCount(18);
    expect(result).toEqual({ ok: true, value: 72 });
  });

  test('rejects counts below 30 bpm', () => {
    const result = validateTapCount(5);
    expect(result.ok).toBe(false);
  });

  test('rejects counts above 220 bpm', () => {
    const result = validateTapCount(60);
    expect(result.ok).toBe(false);
  });
});
