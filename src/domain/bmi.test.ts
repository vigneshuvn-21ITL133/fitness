import { describe, expect, test } from 'bun:test';

import { bmiCategory, computeBmi, getBmiResult } from './bmi';

describe('computeBmi', () => {
  test('matches the standard formula', () => {
    // 70 kg at 1.75 m → 22.86 → 22.9
    expect(computeBmi(70, 175)).toBe(22.9);
  });

  test('handles a heavier adult', () => {
    // 100 kg at 1.80 m → 30.86 → 30.9
    expect(computeBmi(100, 180)).toBe(30.9);
  });
});

describe('bmiCategory boundaries (adult WHO categories)', () => {
  test.each([
    [18.4, 'underweight'],
    [18.5, 'healthy'],
    [24.9, 'healthy'],
    [25, 'overweight'],
    [29.9, 'overweight'],
    [30, 'obesity'],
  ] as const)('BMI %p is %p', (bmi, expected) => {
    expect(bmiCategory(bmi)).toBe(expected);
  });
});

describe('getBmiResult', () => {
  test('gives an adult category from 18', () => {
    const result = getBmiResult(70, 175, 30);
    expect(result.kind).toBe('adult');
    if (result.kind === 'adult') {
      expect(result.category).toBe('healthy');
      expect(result.label).toBe('Healthy weight');
    }
  });

  test('withholds adult categories under 18', () => {
    const result = getBmiResult(50, 160, 15);
    expect(result.kind).toBe('minor');
    expect(result).not.toHaveProperty('category');
    expect(result.guidance).toContain('Adult BMI categories do not apply');
  });

  test('treats exactly 18 as an adult', () => {
    expect(getBmiResult(70, 175, 18).kind).toBe('adult');
  });
});
