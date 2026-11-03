/**
 * Running step total for Android. The Android pedometer cannot count steps
 * between two dates, so the app keeps its own running total from the live
 * step listener and reads day and walk counts from it. Pure functions only.
 */

export interface StepPoint {
  /** Milliseconds since the epoch. */
  t: number;
  /** Lifetime total of steps counted by the app at that time. */
  total: number;
}

export interface StepLog {
  /** Lifetime total counted by the app. Only ever grows. */
  lifetime: number;
  points: StepPoint[];
}

/** Points closer together than this are merged to keep storage small. */
export const MIN_POINT_GAP_MS = 15_000;
/** How long points are kept. Enough for today's and this week's walk lookups. */
export const KEEP_MS = 3 * 24 * 60 * 60 * 1000;

export function emptyStepLog(): StepLog {
  return { lifetime: 0, points: [] };
}

/**
 * Applies a reading from the step listener. `raw` is the count the listener
 * reports since it started, and `previousRaw` is the last value from that same
 * listener (0 when it has just started). If the value ever goes down, the
 * listener restarted, so the whole value counts as new steps.
 */
export function applyReading(log: StepLog, raw: number, previousRaw: number, now: number): StepLog {
  if (!Number.isFinite(raw) || raw < 0) return log;
  const delta = raw >= previousRaw ? raw - previousRaw : raw;
  if (delta === 0) return log;

  const lifetime = log.lifetime + delta;
  const points = log.points.slice();
  const last = points[points.length - 1];
  if (last && now - last.t < MIN_POINT_GAP_MS) {
    points[points.length - 1] = { t: now, total: lifetime };
  } else {
    points.push({ t: now, total: lifetime });
  }
  return { lifetime, points: prune(points, now) };
}

/** Keeps points inside KEEP_MS, plus the last point before that window so lookups still work. */
export function prune(points: StepPoint[], now: number): StepPoint[] {
  const cutoff = now - KEEP_MS;
  const inside = points.filter((p) => p.t >= cutoff);
  const before = points.filter((p) => p.t < cutoff);
  return before.length > 0 ? [before[before.length - 1], ...inside] : inside;
}

/** Lifetime total at time `t`: the last point at or before `t`, or 0 before any point. */
export function totalAt(log: StepLog, t: number): number {
  let result = 0;
  for (const p of log.points) {
    if (p.t <= t) result = p.total;
    else break;
  }
  return result;
}

/** Steps counted between two times. Never negative. */
export function stepsBetween(log: StepLog, start: number, end: number): number {
  if (end <= start) return 0;
  return Math.max(0, totalAt(log, end) - totalAt(log, start));
}
