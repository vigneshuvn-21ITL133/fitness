import { describe, expect, test } from 'bun:test';

import { averageBp, categorizeBp } from './bloodPressure';

describe('categorizeBp (ACC/AHA 2017)', () => {
  test.each([
    [110, 70, 'normal'],
    [119, 79, 'normal'],
    [120, 79, 'elevated'],
    [129, 79, 'elevated'],
    [130, 70, 'stage1'],
    [118, 80, 'stage1'],
    [140, 70, 'stage2'],
    [120, 90, 'stage2'],
    [181, 80, 'crisis'],
    [150, 121, 'crisis'],
  ] as const)('%p/%p is %p', (sys, dia, expected) => {
    expect(categorizeBp(sys, dia)).toBe(expected);
  });
});

describe('averageBp', () => {
  test('returns null with no readings', () => {
    expect(averageBp([])).toBeNull();
  });

  test('averages and rounds each component', () => {
    expect(
      averageBp([
        { systolic: 120, diastolic: 80 },
        { systolic: 130, diastolic: 85 },
      ]),
    ).toEqual({ systolic: 125, diastolic: 83 });
  });
});
