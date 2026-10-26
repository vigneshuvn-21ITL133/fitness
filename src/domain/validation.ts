/** Input validation for every health form. Pure functions, no UI. */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const LIMITS = {
  age: { min: 5, max: 120 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 20, max: 400 },
  steps: { min: 0, max: 200_000 },
  stepGoal: { min: 1_000, max: 100_000 },
  systolic: { min: 70, max: 260 },
  diastolic: { min: 40, max: 160 },
  heartRate: { min: 30, max: 220 },
} as const;

/** Parses a decimal typed with either '.' or ',' as the separator. */
export function parseDecimal(input: string): number | null {
  const normalised = input.trim().replace(',', '.');
  if (normalised === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalised)) return null;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

function checkRange(
  label: string,
  input: string,
  range: { min: number; max: number },
  integer: boolean,
): Result<number> {
  if (input.trim() === '') return { ok: false, error: `${label} is required.` };
  const value = parseDecimal(input);
  if (value === null) return { ok: false, error: `${label} must be a number.` };
  if (integer && !Number.isInteger(value)) {
    return { ok: false, error: `${label} must be a whole number.` };
  }
  if (value < range.min || value > range.max) {
    return { ok: false, error: `${label} must be between ${range.min} and ${range.max}.` };
  }
  return { ok: true, value };
}

export function validateAge(input: string): Result<number> {
  return checkRange('Age', input, LIMITS.age, true);
}

export function validateHeightCm(input: string): Result<number> {
  return checkRange('Height', input, LIMITS.heightCm, false);
}

/** Weight is validated in kilograms; pass the already-converted value. */
export function validateWeightKg(input: string, kgPerInputUnit = 1): Result<number> {
  const raw = checkRange('Weight', input, {
    min: LIMITS.weightKg.min / kgPerInputUnit,
    max: LIMITS.weightKg.max / kgPerInputUnit,
  }, false);
  if (!raw.ok) return raw;
  return { ok: true, value: raw.value * kgPerInputUnit };
}

export function validateSteps(input: string): Result<number> {
  return checkRange('Steps', input, LIMITS.steps, true);
}

export function validateStepGoal(input: string): Result<number> {
  return checkRange('Step goal', input, LIMITS.stepGoal, true);
}

export function validateBloodPressure(
  systolicInput: string,
  diastolicInput: string,
): Result<{ systolic: number; diastolic: number }> {
  const systolic = checkRange('Systolic', systolicInput, LIMITS.systolic, true);
  if (!systolic.ok) return systolic;
  const diastolic = checkRange('Diastolic', diastolicInput, LIMITS.diastolic, true);
  if (!diastolic.ok) return diastolic;
  if (systolic.value <= diastolic.value) {
    return { ok: false, error: 'Systolic must be higher than diastolic.' };
  }
  return { ok: true, value: { systolic: systolic.value, diastolic: diastolic.value } };
}

export function validateHeartRate(input: string): Result<number> {
  return checkRange('Heart rate', input, LIMITS.heartRate, true);
}
