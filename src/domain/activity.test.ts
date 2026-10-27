import { describe, expect, test } from 'bun:test';

import {
  addRoutePoint,
  decidePoint,
  estimateSessionKcal,
  haversineM,
  paceMinPerKm,
  pauseSession,
  recoverSession,
  resumeSession,
  routeDistanceM,
  sessionDayKey,
  sessionSteps,
  startSession,
  stopSession,
  checkpointSession,
  walkingMet,
} from './activity';
import type { RoutePoint } from '@/types';

const pt = (lat: number, lng: number, t: number, acc = 5): RoutePoint => ({ lat, lng, t, acc });

describe('haversineM', () => {
  test('0.001 degrees of latitude is about 111 m', () => {
    const d = haversineM({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 });
    expect(Math.abs(d - 111.2)).toBeLessThan(0.5);
  });

  test('zero distance for identical points', () => {
    expect(haversineM({ lat: 51.5, lng: -0.12 }, { lat: 51.5, lng: -0.12 })).toBe(0);
  });
});

describe('decidePoint', () => {
  test('first accurate point is accepted with zero distance', () => {
    expect(decidePoint(null, pt(0, 0, 1000))).toEqual({ accept: true, distanceM: 0 });
  });

  test('inaccurate points are rejected', () => {
    expect(decidePoint(null, pt(0, 0, 1000, 30))).toEqual({ accept: false, reason: 'inaccurate' });
  });

  test('invalid coordinates are rejected', () => {
    expect(decidePoint(null, pt(91, 0, 1000))).toEqual({ accept: false, reason: 'invalid' });
    expect(decidePoint(null, pt(0, 200, 1000))).toEqual({ accept: false, reason: 'invalid' });
  });

  test('same timestamp is a duplicate', () => {
    const prev = pt(0, 0, 1000);
    expect(decidePoint(prev, pt(0.001, 0, 1000))).toEqual({ accept: false, reason: 'duplicate-time' });
  });

  test('movement under 3 m is jitter', () => {
    const prev = pt(0, 0, 0);
    const next = pt(0.00002, 0, 5000); // about 2.2 m
    expect(decidePoint(prev, next)).toEqual({ accept: false, reason: 'jitter' });
  });

  test('faster than 12 m/s is a jump', () => {
    const prev = pt(0, 0, 0);
    const next = pt(0.001, 0, 1000); // about 111 m in 1 s
    expect(decidePoint(prev, next)).toEqual({ accept: false, reason: 'jump' });
  });

  test('a normal walking step is accepted with its distance', () => {
    const prev = pt(0, 0, 0);
    const next = pt(0.00018, 0, 10_000); // about 20 m in 10 s
    const decision = decidePoint(prev, next);
    expect(decision.accept).toBe(true);
    if (decision.accept) expect(Math.round(decision.distanceM)).toBe(20);
  });
});

describe('routeDistanceM', () => {
  test('sums only accepted segments', () => {
    const route = [
      pt(0, 0, 0),
      pt(0.00018, 0, 10_000), // accepted, about 20 m
      pt(0.00018, 0, 11_000), // jitter, ignored
      pt(0.00036, 0, 20_000), // accepted, about 20 m
    ];
    expect(Math.round(routeDistanceM(route))).toBe(40);
  });
});

describe('pace and calories', () => {
  test('pace is minutes per km', () => {
    expect(paceMinPerKm(1000, 6 * 60_000)).toBeCloseTo(6, 5);
  });

  test('pace is null with too little distance or time', () => {
    expect(paceMinPerKm(5, 60_000)).toBeNull();
    expect(paceMinPerKm(1000, 0)).toBeNull();
  });

  test('MET steps up with walking speed', () => {
    expect(walkingMet(3)).toBe(2.8);
    expect(walkingMet(5)).toBe(3.5);
    expect(walkingMet(6)).toBe(4.3);
    expect(walkingMet(7)).toBe(5);
  });

  test('kcal = MET × kg × hours (5 km/h, 70 kg, 1 h)', () => {
    expect(estimateSessionKcal(70, 3_600_000, 5000)).toBe(245);
  });

  test('zero active time gives zero kcal', () => {
    expect(estimateSessionKcal(70, 0, 0)).toBe(0);
  });
});

describe('session lifecycle', () => {
  test('start, pause, resume, stop accumulates time and steps', () => {
    let s = startSession('a', 1_000, false);
    expect(s.status).toBe('active');

    s = pauseSession(s, 61_000, 40);
    expect(s.status).toBe('paused');
    expect(s.activeMs).toBe(60_000);
    expect(s.steps).toBe(40);

    s = resumeSession(s, 100_000);
    expect(s.status).toBe('active');
    expect(s.runStartedAt).toBe(100_000);

    s = stopSession(s, 130_000, 10, 70);
    expect(s.status).toBe('completed');
    expect(s.endedAt).toBe(130_000);
    expect(s.activeMs).toBe(90_000);
    expect(s.steps).toBe(50);
    expect(s.kcalWeightKg).toBe(70);
    // No distance recorded, so the 3.5 km/h fallback speed applies (2.8 MET band).
    expect(s.kcal).toBe(5);
  });

  test('pausing a paused session does nothing', () => {
    const paused = pauseSession(startSession('a', 0, false), 1000, 1);
    expect(pauseSession(paused, 2000, 5)).toBe(paused);
  });

  test('stopping a completed session does nothing', () => {
    const done = stopSession(startSession('a', 0, false), 1000, 0, 70);
    expect(stopSession(done, 9000, 99, 70)).toBe(done);
  });

  test('checkpoint only moves lastSeenAt while active', () => {
    const s = startSession('a', 0, false);
    expect(checkpointSession(s, 5000).lastSeenAt).toBe(5000);
    const paused = pauseSession(s, 1000, 0);
    expect(checkpointSession(paused, 5000)).toBe(paused);
  });

  test('recovery counts time and steps only up to the last heartbeat', () => {
    const s = checkpointSession(startSession('a', 0, false), 50_000);
    const recovered = recoverSession(s, 30);
    expect(recovered.status).toBe('interrupted');
    expect(recovered.endedAt).toBe(50_000);
    expect(recovered.activeMs).toBe(50_000);
    expect(recovered.steps).toBe(30);
  });

  test('recovering a paused session keeps its stored time', () => {
    const paused = pauseSession(startSession('a', 0, false), 20_000, 15);
    const recovered = recoverSession(paused, 999);
    expect(recovered.status).toBe('interrupted');
    expect(recovered.activeMs).toBe(20_000);
    expect(recovered.steps).toBe(15);
  });

  test('GPS points add distance and keep the route', () => {
    let s = startSession('a', 0, true);
    s = addRoutePoint(s, pt(0, 0, 0));
    s = addRoutePoint(s, pt(0.00018, 0, 10_000));
    expect(s.route).toHaveLength(2);
    expect(Math.round(s.distanceM)).toBe(20);
  });

  test('rejected GPS points are not added', () => {
    let s = startSession('a', 0, true);
    s = addRoutePoint(s, pt(0, 0, 0, 80));
    expect(s.route).toHaveLength(0);
    expect(s.distanceM).toBe(0);
  });

  test('sessionSteps prefers a manual count', () => {
    const s = { ...startSession('a', 0, false), steps: 40, manualSteps: 1200 };
    expect(sessionSteps(s)).toBe(1200);
    expect(sessionSteps({ ...s, manualSteps: null })).toBe(40);
  });

  test('sessionDayKey uses the local calendar date of the start', () => {
    const start = new Date(2026, 9, 5, 9, 30).getTime();
    expect(sessionDayKey(startSession('a', start, false))).toBe('2026-10-05');
  });
});
