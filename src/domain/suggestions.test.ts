import { describe, expect, test } from 'bun:test';

import { buildSuggestions, type SuggestionInputs } from '@/domain/suggestions';

const base: SuggestionInputs = {
  stepsToday: 6000,
  stepGoal: 10000,
  moodsThisWeek: [],
  latestBp: null,
  latestHeartRate: null,
  bmiCategory: null,
};

const ids = (input: Partial<SuggestionInputs>) =>
  buildSuggestions({ ...base, ...input }).map((s) => s.id);

describe('buildSuggestions', () => {
  test('falls back to a keep-logging suggestion when nothing needs attention', () => {
    expect(ids({ stepsToday: 6000 })).toEqual(['keep-logging']);
  });

  test('suggests a walk when under half the step goal', () => {
    expect(ids({ stepsToday: 2000 })).toContain('activity-low');
  });

  test('celebrates reaching the step goal', () => {
    expect(ids({ stepsToday: 10000 })).toContain('activity-goal');
  });

  test('flags a low mood week only with enough entries', () => {
    expect(ids({ moodsThisWeek: ['sad', 'angry'] })).not.toContain('mood-low');
    expect(ids({ moodsThisWeek: ['sad', 'angry', 'happy'] })).toContain('mood-low');
  });

  test('gives urgent guidance for a crisis-level blood pressure', () => {
    const result = buildSuggestions({ ...base, latestBp: { systolic: 190, diastolic: 100 } });
    expect(result.map((s) => s.id)).toContain('bp-crisis');
    expect(result.find((s) => s.id === 'bp-crisis')?.body).toContain('emergency services');
  });

  test('suggests a clinician check for stage 1 blood pressure', () => {
    expect(ids({ latestBp: { systolic: 135, diastolic: 85 } })).toContain('bp-high');
  });

  test('does not flag a normal blood pressure', () => {
    expect(ids({ latestBp: { systolic: 115, diastolic: 75 } })).not.toContain('bp-high');
  });

  test('flags high and low resting heart rate', () => {
    expect(ids({ latestHeartRate: 110 })).toContain('heart-high');
    expect(ids({ latestHeartRate: 45 })).toContain('heart-low');
    expect(ids({ latestHeartRate: 72 })).toEqual(['keep-logging']);
  });

  test('gives weight guidance only for adult overweight or underweight', () => {
    expect(ids({ bmiCategory: 'overweight' })).toContain('weight-high');
    expect(ids({ bmiCategory: 'underweight' })).toContain('weight-low');
    expect(ids({ bmiCategory: 'healthy' })).toEqual(['keep-logging']);
  });

  test('every suggestion states a health benefit', () => {
    const result = buildSuggestions({
      ...base,
      stepsToday: 0,
      moodsThisWeek: ['sad', 'sad', 'angry'],
      latestBp: { systolic: 150, diastolic: 95 },
      latestHeartRate: 120,
      bmiCategory: 'obesity',
    });
    expect(result.length).toBeGreaterThan(3);
    for (const s of result) expect(s.benefit.length).toBeGreaterThan(0);
  });
});
