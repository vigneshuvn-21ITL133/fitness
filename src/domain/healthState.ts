/**
 * Pure state transitions for the health data. The React store calls these
 * and persists the result; keeping them pure makes them easy to test.
 */
import { DEFAULT_STEP_GOAL } from '@/domain/steps';
import type {
  BloodPressureEntry,
  HealthState,
  Profile,
  StepDay,
  WeightEntry,
} from '@/types';

export function initialHealthState(): HealthState {
  return {
    version: 1,
    profile: null,
    stepGoal: DEFAULT_STEP_GOAL,
    steps: {},
    weights: [],
    bloodPressure: [],
  };
}

export function setProfile(state: HealthState, profile: Profile): HealthState {
  return { ...state, profile };
}

export function setStepGoal(state: HealthState, goal: number): HealthState {
  return { ...state, stepGoal: goal };
}

function updateDay(
  state: HealthState,
  dayKey: string,
  patch: Partial<StepDay>,
): HealthState {
  const current = state.steps[dayKey] ?? {};
  return { ...state, steps: { ...state.steps, [dayKey]: { ...current, ...patch } } };
}

/** Pass `null` to clear a manual entry and fall back to the sensor. */
export function setManualSteps(state: HealthState, dayKey: string, count: number | null): HealthState {
  return updateDay(state, dayKey, { manual: count ?? undefined });
}

export function setSensorSteps(state: HealthState, dayKey: string, count: number): HealthState {
  return updateDay(state, dayKey, { sensor: count });
}

export function addWeight(state: HealthState, entry: WeightEntry): HealthState {
  return { ...state, weights: [...state.weights, entry] };
}

export function updateWeight(state: HealthState, id: string, kg: number): HealthState {
  return {
    ...state,
    weights: state.weights.map((w) => (w.id === id ? { ...w, kg } : w)),
  };
}

export function deleteWeight(state: HealthState, id: string): HealthState {
  return { ...state, weights: state.weights.filter((w) => w.id !== id) };
}

export function addBloodPressure(state: HealthState, entry: BloodPressureEntry): HealthState {
  return { ...state, bloodPressure: [...state.bloodPressure, entry] };
}

export function updateBloodPressure(
  state: HealthState,
  id: string,
  systolic: number,
  diastolic: number,
): HealthState {
  return {
    ...state,
    bloodPressure: state.bloodPressure.map((b) =>
      b.id === id ? { ...b, systolic, diastolic } : b,
    ),
  };
}

export function deleteBloodPressure(state: HealthState, id: string): HealthState {
  return { ...state, bloodPressure: state.bloodPressure.filter((b) => b.id !== id) };
}

/** Weights sorted oldest → newest. */
export function sortedWeights(weights: WeightEntry[]): WeightEntry[] {
  return [...weights].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function latestWeight(weights: WeightEntry[]): WeightEntry | null {
  const sorted = sortedWeights(weights);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

/** Change between the two most recent weights in kg, or null with fewer than two. */
export function weightChange(weights: WeightEntry[]): number | null {
  const sorted = sortedWeights(weights);
  if (sorted.length < 2) return null;
  const last = sorted[sorted.length - 1].kg;
  const previous = sorted[sorted.length - 2].kg;
  return Math.round((last - previous) * 100) / 100;
}

export function sortedBloodPressure(entries: BloodPressureEntry[]): BloodPressureEntry[] {
  return [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function latestBloodPressure(entries: BloodPressureEntry[]): BloodPressureEntry | null {
  const sorted = sortedBloodPressure(entries);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates stored JSON. Malformed parts are dropped rather than crashing
 * the app, so bad data never reaches the UI.
 */
export function sanitizeHealthState(raw: unknown): HealthState {
  const base = initialHealthState();
  if (!isRecord(raw)) return base;

  let profile: Profile | null = null;
  if (isRecord(raw.profile)) {
    const p = raw.profile;
    const units = p.units === 'metric' || p.units === 'imperial' ? p.units : null;
    if (isFiniteNumber(p.age) && isFiniteNumber(p.heightCm) && units !== null) {
      profile = { age: p.age, heightCm: p.heightCm, units };
    }
  }

  const stepGoal = isFiniteNumber(raw.stepGoal) && raw.stepGoal > 0 ? raw.stepGoal : base.stepGoal;

  const steps: Record<string, StepDay> = {};
  if (isRecord(raw.steps)) {
    for (const [key, value] of Object.entries(raw.steps)) {
      if (!isRecord(value)) continue;
      const day: StepDay = {};
      if (isFiniteNumber(value.sensor)) day.sensor = value.sensor;
      if (isFiniteNumber(value.manual)) day.manual = value.manual;
      steps[key] = day;
    }
  }

  const weights = Array.isArray(raw.weights)
    ? raw.weights.filter(
        (w): w is WeightEntry =>
          isRecord(w) &&
          typeof w.id === 'string' &&
          typeof w.timestamp === 'string' &&
          isFiniteNumber(w.kg),
      )
    : [];

  const bloodPressure = Array.isArray(raw.bloodPressure)
    ? raw.bloodPressure.filter(
        (b): b is BloodPressureEntry =>
          isRecord(b) &&
          typeof b.id === 'string' &&
          typeof b.timestamp === 'string' &&
          isFiniteNumber(b.systolic) &&
          isFiniteNumber(b.diastolic),
      )
    : [];

  return { version: 1, profile, stepGoal, steps, weights, bloodPressure };
}
