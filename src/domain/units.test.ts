import { describe, expect, test } from 'bun:test';

import { formatChange, formatHeight, formatWeight, kgPerInputUnit, kgToDisplay } from './units';

describe('units', () => {
  test('converts kilograms to pounds for imperial display', () => {
    expect(kgToDisplay(100, 'imperial')).toBeCloseTo(220.46, 1);
    expect(kgToDisplay(100, 'metric')).toBe(100);
  });

  test('kgPerInputUnit maps the active unit back to kilograms', () => {
    expect(kgPerInputUnit('metric')).toBe(1);
    expect(kgPerInputUnit('imperial')).toBeCloseTo(0.4536, 4);
  });

  test('formats weight, height and signed change', () => {
    expect(formatWeight(72.5, 'metric')).toBe('72.5 kg');
    expect(formatWeight(72.5, 'imperial')).toBe('159.8 lb');
    expect(formatHeight(170, 'metric')).toBe('170 cm');
    expect(formatHeight(170, 'imperial')).toBe('5 ft 7 in');
    expect(formatChange(1.2, 'metric')).toBe('+1.2 kg');
    expect(formatChange(-0.5, 'metric')).toBe('-0.5 kg');
  });
});
