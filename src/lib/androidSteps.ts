/**
 * Android step storage. Keeps the step log in memory and saves it to
 * AsyncStorage at most every few seconds, because the listener reports every
 * step. Storage failures never stop counting; the in-memory log stays correct.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { applyReading, emptyStepLog, stepsBetween, type StepLog } from '@/domain/stepLog';

const STORAGE_KEY = 'pulse.steps.android.v1';
const SAVE_EVERY_MS = 5_000;

let cache: StepLog | null = null;
let loading: Promise<StepLog> | null = null;
let dirty = false;
let lastSaveAt = 0;

function isStepLog(value: unknown): value is StepLog {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { lifetime?: unknown; points?: unknown };
  return (
    typeof v.lifetime === 'number' &&
    Number.isFinite(v.lifetime) &&
    Array.isArray(v.points) &&
    v.points.every(
      (p) =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as { t?: unknown }).t === 'number' &&
        typeof (p as { total?: unknown }).total === 'number',
    )
  );
}

/** Loads the log once. Returns an empty log if storage is unreadable. */
export function getStepLog(): Promise<StepLog> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        cache = isStepLog(parsed) ? parsed : emptyStepLog();
      } catch {
        cache = emptyStepLog();
      }
      return cache;
    })();
  }
  return loading;
}

async function save(force: boolean): Promise<void> {
  if (!cache || !dirty) return;
  const now = Date.now();
  if (!force && now - lastSaveAt < SAVE_EVERY_MS) return;
  lastSaveAt = now;
  dirty = false;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    dirty = true; // try again on the next save
  }
}

/** Records a reading from the step listener. `previousRaw` is that listener's last value. */
export async function recordAndroidReading(raw: number, previousRaw: number): Promise<void> {
  const log = await getStepLog();
  const next = applyReading(log, raw, previousRaw, Date.now());
  if (next !== log) {
    cache = next;
    dirty = true;
    await save(false);
  }
}

/** Steps counted between two times, from the saved log. */
export async function androidStepsBetween(start: number, end: number): Promise<number> {
  const log = await getStepLog();
  return stepsBetween(log, start, end);
}

/** Writes any unsaved steps now. Call when a walk or the step screen closes. */
export async function flushAndroidSteps(): Promise<void> {
  await save(true);
}
