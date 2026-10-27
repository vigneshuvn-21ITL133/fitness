import { describe, expect, test } from 'bun:test';

import {
  addWeight,
  deleteWeight,
  initialHealthState,
  latestWeight,
  sanitizeHealthState,
  setManualSteps,
  setSensorSteps,
  updateWeight,
  weightChange,
} from './healthState';

const w = (id: string, timestamp: string, kg: number, source: 'manual' | 'healthkit' = 'manual') => ({
  id,
  timestamp,
  kg,
  source,
});

describe('weight changes', () => {
  test('no change with fewer than two entries', () => {
    expect(weightChange([])).toBeNull();
    expect(weightChange([w('a', '2026-10-01T08:00', 80)])).toBeNull();
  });

  test('change is newest minus previous, regardless of insert order', () => {
    const entries = [
      w('b', '2026-10-10T08:00', 78.4),
      w('a', '2026-10-01T08:00', 80),
    ];
    expect(weightChange(entries)).toBe(-1.6);
  });

  test('latestWeight returns the most recent timestamp', () => {
    const entries = [w('b', '2026-10-10T08:00', 78), w('a', '2026-10-01T08:00', 80)];
    expect(latestWeight(entries)?.id).toBe('b');
  });

  test('add, update and delete keep the list consistent', () => {
    let state = initialHealthState();
    state = addWeight(state, w('x', '2026-10-01T08:00', 80));
    state = addWeight(state, w('y', '2026-10-08T08:00', 79));
    state = updateWeight(state, 'x', 81);
    expect(state.weights.find((e) => e.id === 'x')?.kg).toBe(81);
    expect(weightChange(state.weights)).toBe(-2);
    state = deleteWeight(state, 'y');
    expect(state.weights).toHaveLength(1);
    expect(weightChange(state.weights)).toBeNull();
  });
});

describe('step tracking state', () => {
  test('manual entry overrides sensor and can be cleared', () => {
    let state = initialHealthState();
    state = setSensorSteps(state, '2026-10-26', 3000);
    state = setManualSteps(state, '2026-10-26', 7000);
    expect(state.steps['2026-10-26']).toEqual({ sensor: 3000, manual: 7000 });
    state = setManualSteps(state, '2026-10-26', null);
    expect(state.steps['2026-10-26'].manual).toBeUndefined();
    expect(state.steps['2026-10-26'].sensor).toBe(3000);
  });
});

describe('sanitizeHealthState', () => {
  test('returns defaults for non-objects', () => {
    expect(sanitizeHealthState(null)).toEqual(initialHealthState());
    expect(sanitizeHealthState('bad')).toEqual(initialHealthState());
  });

  test('drops malformed entries but keeps valid ones', () => {
    const state = sanitizeHealthState({
      weights: [w('ok', '2026-10-01T08:00', 80), { id: 1, kg: 'x' }],
      bloodPressure: [{ id: 'bp', timestamp: 't', systolic: 120, diastolic: 80, source: 'manual' }, null],
      steps: { '2026-10-26': { manual: 4000, sensor: 'nope' } },
      stepGoal: -5,
    });
    expect(state.weights).toHaveLength(1);
    expect(state.bloodPressure).toHaveLength(1);
    expect(state.steps['2026-10-26']).toEqual({ manual: 4000 });
    expect(state.stepGoal).toBe(initialHealthState().stepGoal);
  });

  test('defaults reading source to manual for legacy entries', () => {
    const state = sanitizeHealthState({
      weights: [{ id: 'w', timestamp: '2026-10-01T08:00', kg: 75 }],
      bloodPressure: [{ id: 'bp', timestamp: '2026-10-01T08:00', systolic: 120, diastolic: 80 }],
    });
    expect(state.weights[0]?.source).toBe('manual');
    expect(state.bloodPressure[0]?.source).toBe('manual');
  });

  test('keeps known reading sources and drops unknown ones', () => {
    const state = sanitizeHealthState({
      weights: [
        { id: 'w1', timestamp: '2026-10-01T08:00', kg: 75, source: 'healthkit' },
        { id: 'w2', timestamp: '2026-10-01T08:01', kg: 74, source: 'other' },
      ],
      bloodPressure: [
        { id: 'bp1', timestamp: '2026-10-01T08:00', systolic: 120, diastolic: 80, source: 'derived' },
        { id: 'bp2', timestamp: '2026-10-01T08:01', systolic: 121, diastolic: 81, source: 'other' },
      ],
    });
    expect(state.weights).toHaveLength(1);
    expect(state.weights[0]?.source).toBe('healthkit');
    expect(state.bloodPressure).toHaveLength(1);
    expect(state.bloodPressure[0]?.source).toBe('derived');
  });

  test('rejects an unknown profile units value', () => {
    const state = sanitizeHealthState({ profile: { age: 30, heightCm: 170, units: 'stone' } });
    expect(state.profile).toBeNull();
  });
});
