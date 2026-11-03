import { describe, expect, test } from 'bun:test';

import {
  applyReading,
  emptyStepLog,
  KEEP_MS,
  MIN_POINT_GAP_MS,
  stepsBetween,
  totalAt,
} from '@/domain/stepLog';

const T0 = 1_700_000_000_000;

describe('applyReading', () => {
  test('adds the increase since the previous reading', () => {
    const log = applyReading(emptyStepLog(), 120, 0, T0);
    expect(log.lifetime).toBe(120);
    const next = applyReading(log, 150, 120, T0 + 60_000);
    expect(next.lifetime).toBe(150);
  });

  test('treats a lower value as a listener restart and counts it in full', () => {
    const log = { lifetime: 500, points: [] };
    const next = applyReading(log, 40, 900, T0);
    expect(next.lifetime).toBe(540);
  });

  test('ignores zero change and invalid readings', () => {
    const log = applyReading(emptyStepLog(), 10, 0, T0);
    expect(applyReading(log, 10, 10, T0 + 1000)).toBe(log);
    expect(applyReading(log, Number.NaN, 10, T0 + 1000)).toBe(log);
  });

  test('merges points closer than the minimum gap', () => {
    let log = applyReading(emptyStepLog(), 1, 0, T0);
    log = applyReading(log, 2, 1, T0 + 1000);
    expect(log.points).toHaveLength(1);
    log = applyReading(log, 3, 2, T0 + MIN_POINT_GAP_MS + 1000);
    expect(log.points).toHaveLength(2);
  });

  test('drops points older than the keep window', () => {
    let log = applyReading(emptyStepLog(), 10, 0, T0);
    log = applyReading(log, 20, 10, T0 + KEEP_MS + 60_000);
    expect(log.points.length).toBe(2);
    expect(log.points[0].t).toBe(T0);
  });
});

describe('stepsBetween', () => {
  test('counts steps between two times', () => {
    let log = applyReading(emptyStepLog(), 100, 0, T0);
    log = applyReading(log, 400, 100, T0 + 3_600_000);
    expect(stepsBetween(log, T0 + 1_000, T0 + 3_600_000)).toBe(300);
  });

  test('is zero for an empty or reversed range', () => {
    const log = applyReading(emptyStepLog(), 100, 0, T0);
    expect(stepsBetween(log, T0 + 1000, T0)).toBe(0);
    expect(stepsBetween(emptyStepLog(), T0, T0 + 1000)).toBe(0);
  });

  test('uses zero as the baseline before the first point', () => {
    const log = applyReading(emptyStepLog(), 250, 0, T0);
    expect(totalAt(log, T0 - 10_000)).toBe(0);
    expect(stepsBetween(log, T0 - 10_000, T0 + 1)).toBe(250);
  });
});
