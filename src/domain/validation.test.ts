import { describe, expect, test } from 'bun:test';

import {
  parseDecimal,
  validateAge,
  validateBloodPressure,
  validateHeightCm,
  validateSteps,
  validateStepGoal,
  validateWeightKg,
} from './validation';

describe('parseDecimal', () => {
  test('accepts dot and comma decimal separators', () => {
    expect(parseDecimal('72.5')).toBe(72.5);
    expect(parseDecimal('72,5')).toBe(72.5);
    expect(parseDecimal(' 80 ')).toBe(80);
  });

  test('rejects empty and non-numeric input', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1.2.3')).toBeNull();
    expect(parseDecimal('12kg')).toBeNull();
  });
});

describe('validateAge', () => {
  test('accepts whole ages in range', () => {
    expect(validateAge('16')).toEqual({ ok: true, value: 16 });
  });

  test('rejects missing, fractional and out-of-range ages', () => {
    expect(validateAge('').ok).toBe(false);
    expect(validateAge('16.5').ok).toBe(false);
    expect(validateAge('4').ok).toBe(false);
    expect(validateAge('121').ok).toBe(false);
  });
});

describe('validateHeightCm', () => {
  test('accepts heights in range and rejects others', () => {
    expect(validateHeightCm('175')).toEqual({ ok: true, value: 175 });
    expect(validateHeightCm('99').ok).toBe(false);
    expect(validateHeightCm('251').ok).toBe(false);
  });
});

describe('validateWeightKg', () => {
  test('returns kilograms unchanged for metric input', () => {
    expect(validateWeightKg('75')).toEqual({ ok: true, value: 75 });
  });

  test('converts pounds to kilograms', () => {
    const result = validateWeightKg('165.3', 0.45359237);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(74.98, 1);
  });

  test('rejects implausible weights', () => {
    expect(validateWeightKg('5').ok).toBe(false);
    expect(validateWeightKg('500').ok).toBe(false);
  });
});

describe('validateSteps and validateStepGoal', () => {
  test('steps must be whole and non-negative', () => {
    expect(validateSteps('8500')).toEqual({ ok: true, value: 8500 });
    expect(validateSteps('-1').ok).toBe(false);
    expect(validateSteps('10.5').ok).toBe(false);
  });

  test('goal has a sensible minimum', () => {
    expect(validateStepGoal('10000').ok).toBe(true);
    expect(validateStepGoal('500').ok).toBe(false);
  });
});

describe('validateBloodPressure', () => {
  test('accepts a valid reading', () => {
    expect(validateBloodPressure('120', '80')).toEqual({
      ok: true,
      value: { systolic: 120, diastolic: 80 },
    });
  });

  test('requires systolic to be higher than diastolic', () => {
    const result = validateBloodPressure('80', '90');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('higher than diastolic');
  });

  test('rejects out-of-range values', () => {
    expect(validateBloodPressure('300', '80').ok).toBe(false);
    expect(validateBloodPressure('120', '30').ok).toBe(false);
  });
});
