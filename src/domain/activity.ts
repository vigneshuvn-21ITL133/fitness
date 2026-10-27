/**
 * Activity session logic: GPS point filtering, distance, pace, calorie
 * estimates and session transitions. Pure functions only.
 */
import { toDateKey } from '@/lib/date';
import type { ActivitySession, RoutePoint } from '@/types';

/** Points less accurate than this are dropped. */
export const MAX_ACCURACY_M = 25;
/** Movements shorter than this are treated as GPS jitter. */
export const MIN_STEP_M = 3;
/** Faster than this (about 43 km/h) between points is treated as a GPS jump. */
export const MAX_SPEED_MPS = 12;
/** Pace is only meaningful once there is some distance. */
export const MIN_PACE_DISTANCE_M = 10;
export const DEFAULT_WEIGHT_KG = 70;

const EARTH_RADIUS_M = 6_371_000;

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type PointDecision =
  | { accept: true; distanceM: number }
  | { accept: false; reason: 'inaccurate' | 'duplicate-time' | 'jitter' | 'jump' | 'invalid' };

/** Decides whether a new GPS point should be added to the route. */
export function decidePoint(prev: RoutePoint | null, next: RoutePoint): PointDecision {
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng) || !Number.isFinite(next.t)) {
    return { accept: false, reason: 'invalid' };
  }
  if (next.lat < -90 || next.lat > 90 || next.lng < -180 || next.lng > 180) {
    return { accept: false, reason: 'invalid' };
  }
  if (next.acc > MAX_ACCURACY_M) return { accept: false, reason: 'inaccurate' };
  if (!prev) return { accept: true, distanceM: 0 };

  const dtS = (next.t - prev.t) / 1000;
  if (dtS <= 0) return { accept: false, reason: 'duplicate-time' };

  const distanceM = haversineM(prev, next);
  if (distanceM < MIN_STEP_M) return { accept: false, reason: 'jitter' };
  if (distanceM / dtS > MAX_SPEED_MPS) return { accept: false, reason: 'jump' };
  return { accept: true, distanceM };
}

export function routeDistanceM(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = decidePoint(points[i - 1], points[i]);
    if (d.accept) total += d.distanceM;
  }
  return total;
}

/** Minutes per kilometre, or null when there is too little distance to say. */
export function paceMinPerKm(distanceM: number, activeMs: number): number | null {
  if (distanceM < MIN_PACE_DISTANCE_M || activeMs <= 0) return null;
  const minutes = activeMs / 60_000;
  return minutes / (distanceM / 1000);
}

/** Walking MET by average speed (Compendium of Physical Activity, rounded). */
export function walkingMet(kmh: number): number {
  if (kmh < 4) return 2.8;
  if (kmh < 5.5) return 3.5;
  if (kmh < 6.5) return 4.3;
  return 5.0;
}

/**
 * Estimated energy in kcal = MET × weight (kg) × hours.
 * Labelled as an estimate in the UI; real energy use varies.
 */
export function estimateSessionKcal(weightKg: number, activeMs: number, distanceM: number): number {
  const hours = activeMs / 3_600_000;
  if (hours <= 0) return 0;
  const kmh = distanceM > 0 ? distanceM / 1000 / hours : 3.5;
  return Math.round(walkingMet(kmh) * weightKg * hours);
}

export function activeMsNow(session: ActivitySession, now: number): number {
  if (session.status === 'active' && session.runStartedAt !== null) {
    return session.activeMs + Math.max(0, now - session.runStartedAt);
  }
  return session.activeMs;
}

export function startSession(id: string, now: number, gps: boolean): ActivitySession {
  return {
    id,
    startedAt: now,
    endedAt: null,
    status: 'active',
    activeMs: 0,
    runStartedAt: now,
    stepRunStart: now,
    steps: 0,
    manualSteps: null,
    lastSeenAt: now,
    gps,
    route: [],
    distanceM: 0,
    kcal: null,
    kcalWeightKg: null,
  };
}

/** Closes the current run and step window. `stepsInRun` comes from the pedometer. */
export function pauseSession(s: ActivitySession, now: number, stepsInRun: number): ActivitySession {
  if (s.status !== 'active') return s;
  return {
    ...s,
    status: 'paused',
    activeMs: activeMsNow(s, now),
    runStartedAt: null,
    stepRunStart: null,
    steps: s.steps + Math.max(0, stepsInRun),
    lastSeenAt: now,
  };
}

export function resumeSession(s: ActivitySession, now: number): ActivitySession {
  if (s.status !== 'paused') return s;
  return { ...s, status: 'active', runStartedAt: now, stepRunStart: now, lastSeenAt: now };
}

/** Saves a heartbeat so a crash can be recovered up to this time. */
export function checkpointSession(s: ActivitySession, now: number): ActivitySession {
  if (s.status !== 'active') return s;
  return { ...s, lastSeenAt: now };
}

export function addRoutePoint(s: ActivitySession, point: RoutePoint): ActivitySession {
  const prev = s.route.length > 0 ? s.route[s.route.length - 1] : null;
  const decision = decidePoint(prev, point);
  if (!decision.accept) return s;
  return {
    ...s,
    route: [...s.route, point],
    distanceM: s.distanceM + decision.distanceM,
    lastSeenAt: point.t,
  };
}

/** Ends the session and snapshots the calorie estimate with the weight used. */
export function stopSession(
  s: ActivitySession,
  now: number,
  stepsInRun: number,
  weightKg: number,
): ActivitySession {
  if (s.status === 'completed') return s;
  const activeMs = activeMsNow(s, now);
  const closedSteps = s.status === 'active' ? s.steps + Math.max(0, stepsInRun) : s.steps;
  return {
    ...s,
    status: 'completed',
    endedAt: now,
    activeMs,
    runStartedAt: null,
    stepRunStart: null,
    steps: closedSteps,
    lastSeenAt: now,
    kcal: estimateSessionKcal(weightKg, activeMs, s.distanceM),
    kcalWeightKg: weightKg,
  };
}

/**
 * Recovers a session that was running when the app was closed or crashed.
 * Time and steps are counted only up to the last saved heartbeat.
 */
export function recoverSession(s: ActivitySession, stepsInRun: number): ActivitySession {
  if (s.status !== 'active' && s.status !== 'paused') return s;
  const endAt = s.lastSeenAt;
  const activeMs =
    s.status === 'active' && s.runStartedAt !== null
      ? s.activeMs + Math.max(0, endAt - s.runStartedAt)
      : s.activeMs;
  const steps = s.status === 'active' ? s.steps + Math.max(0, stepsInRun) : s.steps;
  return {
    ...s,
    status: 'interrupted',
    endedAt: endAt,
    activeMs,
    runStartedAt: null,
    stepRunStart: null,
    steps,
  };
}

/** Total steps for a session, preferring a manual count when one was typed. */
export function sessionSteps(s: ActivitySession): number {
  return s.manualSteps ?? s.steps;
}

/** Local calendar date key (YYYY-MM-DD) for the session start. */
export function sessionDayKey(s: ActivitySession): string {
  return toDateKey(new Date(s.startedAt));
}
