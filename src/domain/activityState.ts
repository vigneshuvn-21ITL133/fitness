import { recoverSession } from '@/domain/activity';
import type { ActivitySession, ActivityState, RoutePoint, SessionStatus } from '@/types';

export function initialActivityState(): ActivityState {
  return { version: 1, sessions: [] };
}

/** The session currently running or paused, if any. Only one is allowed at a time. */
export function currentSession(state: ActivityState): ActivitySession | null {
  return state.sessions.find((s) => s.status === 'active' || s.status === 'paused') ?? null;
}

export function upsertSession(state: ActivityState, session: ActivitySession): ActivityState {
  const exists = state.sessions.some((s) => s.id === session.id);
  return {
    ...state,
    sessions: exists
      ? state.sessions.map((s) => (s.id === session.id ? session : s))
      : [...state.sessions, session],
  };
}

export function deleteSession(state: ActivityState, id: string): ActivityState {
  return { ...state, sessions: state.sessions.filter((s) => s.id !== id) };
}

export function sessionsNewestFirst(state: ActivityState): ActivitySession[] {
  return [...state.sessions].sort((a, b) => b.startedAt - a.startedAt);
}

export function findSession(state: ActivityState, id: string): ActivitySession | null {
  return state.sessions.find((s) => s.id === id) ?? null;
}

/** Sessions that were still running when the app last closed. */
export function unfinishedSessions(state: ActivityState): ActivitySession[] {
  return state.sessions.filter((s) => s.status === 'active' || s.status === 'paused');
}

/** Marks an unfinished session as interrupted, with the step count recovered by the caller. */
export function recoverInState(
  state: ActivityState,
  id: string,
  stepsInRun: number,
): ActivityState {
  const target = findSession(state, id);
  if (!target) return state;
  return upsertSession(state, recoverSession(target, stepsInRun));
}

// ---------------------------------------------------------------------------
// Validation of stored data. Bad entries are dropped instead of crashing.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const STATUSES: SessionStatus[] = ['active', 'paused', 'completed', 'interrupted'];

function sanitizeRoute(raw: unknown): RoutePoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is RoutePoint =>
      isRecord(p) && isNum(p.lat) && isNum(p.lng) && isNum(p.t) && isNum(p.acc),
  );
}

function sanitizeSession(raw: unknown): ActivitySession | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !isNum(raw.startedAt)) return null;
  const status = STATUSES.find((s) => s === raw.status);
  if (!status) return null;
  return {
    id: raw.id,
    startedAt: raw.startedAt,
    endedAt: isNum(raw.endedAt) ? raw.endedAt : null,
    status,
    activeMs: isNum(raw.activeMs) ? Math.max(0, raw.activeMs) : 0,
    runStartedAt: isNum(raw.runStartedAt) ? raw.runStartedAt : null,
    stepRunStart: isNum(raw.stepRunStart) ? raw.stepRunStart : null,
    steps: isNum(raw.steps) ? Math.max(0, raw.steps) : 0,
    manualSteps: isNum(raw.manualSteps) ? raw.manualSteps : null,
    lastSeenAt: isNum(raw.lastSeenAt) ? raw.lastSeenAt : raw.startedAt,
    gps: raw.gps === true,
    route: sanitizeRoute(raw.route),
    distanceM: isNum(raw.distanceM) ? Math.max(0, raw.distanceM) : 0,
    kcal: isNum(raw.kcal) ? raw.kcal : null,
    kcalWeightKg: isNum(raw.kcalWeightKg) ? raw.kcalWeightKg : null,
  };
}

export function sanitizeActivityState(raw: unknown): ActivityState {
  if (!isRecord(raw) || !Array.isArray(raw.sessions)) return initialActivityState();
  const sessions = raw.sessions
    .map(sanitizeSession)
    .filter((s): s is ActivitySession => s !== null);
  return { version: 1, sessions };
}
