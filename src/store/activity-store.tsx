import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  addRoutePoint,
  checkpointSession,
  pauseSession,
  recoverSession,
  resumeSession,
  startSession,
  stopSession,
} from '@/domain/activity';
import {
  currentSession,
  deleteSession,
  initialActivityState,
  sanitizeActivityState,
  unfinishedSessions,
  upsertSession,
} from '@/domain/activityState';
import type { ActivitySession, ActivityState, RoutePoint } from '@/types';

const STORAGE_KEY = 'pulse.activity.v1';

/** Reads steps taken between two times from the device pedometer. 0 if unavailable. */
export async function stepsBetween(start: number | null, end: number): Promise<number> {
  if (start === null || end <= start) return 0;
  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return 0;
    const result = await Pedometer.getStepCountAsync(new Date(start), new Date(end));
    return result.steps;
  } catch {
    return 0;
  }
}

interface ActivityContextValue {
  ready: boolean;
  storageError: string | null;
  state: ActivityState;
  active: ActivitySession | null;
  start: (gps: boolean) => ActivitySession;
  pause: (stepsInRun: number) => void;
  resume: () => void;
  stop: (stepsInRun: number, weightKg: number) => void;
  checkpoint: () => void;
  addPoint: (point: RoutePoint) => void;
  setManualSteps: (id: string, steps: number | null) => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

function newId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ActivityState>(initialActivityState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const latest = useRef<ActivityState>(state);

  const persist = useCallback((next: ActivityState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      .then(() => setStorageError(null))
      .catch(() => setStorageError('Activity could not be saved on this device.'));
  }, []);

  const apply = useCallback(
    (fn: (prev: ActivityState) => ActivityState) => {
      const next = fn(latest.current);
      latest.current = next;
      setState(next);
      persist(next);
    },
    [persist],
  );

  // Load, then recover any session left running when the app closed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        let loaded = raw === null ? initialActivityState() : sanitizeActivityState(JSON.parse(raw));
        for (const s of unfinishedSessions(loaded)) {
          const stepsInRun = await stepsBetween(s.stepRunStart, s.lastSeenAt);
          const recovered = recoverSession(s, stepsInRun);
          loaded = upsertSession(loaded, recovered);
        }
        if (!cancelled) {
          latest.current = loaded;
          setState(loaded);
          persist(loaded);
        }
      } catch {
        if (!cancelled) setStorageError('Saved activity could not be loaded.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persist]);

  const value = useMemo<ActivityContextValue>(() => {
    const update = (id: string, fn: (s: ActivitySession) => ActivitySession) =>
      apply((prev) => {
        const target = prev.sessions.find((s) => s.id === id);
        return target ? upsertSession(prev, fn(target)) : prev;
      });

    return {
      ready,
      storageError,
      state,
      active: currentSession(state),
      start: (gps) => {
        const session = startSession(newId(), Date.now(), gps);
        apply((prev) => upsertSession(prev, session));
        return session;
      },
      pause: (stepsInRun) => {
        const active = currentSession(latest.current);
        if (active) update(active.id, (s) => pauseSession(s, Date.now(), stepsInRun));
      },
      resume: () => {
        const active = currentSession(latest.current);
        if (active) update(active.id, (s) => resumeSession(s, Date.now()));
      },
      stop: (stepsInRun, weightKg) => {
        const active = currentSession(latest.current);
        if (active) update(active.id, (s) => stopSession(s, Date.now(), stepsInRun, weightKg));
      },
      checkpoint: () => {
        const active = currentSession(latest.current);
        if (active) update(active.id, (s) => checkpointSession(s, Date.now()));
      },
      addPoint: (point) => {
        const active = currentSession(latest.current);
        if (active) update(active.id, (s) => addRoutePoint(s, point));
      },
      setManualSteps: (id, steps) => update(id, (s) => ({ ...s, manualSteps: steps })),
      remove: (id) => apply((prev) => deleteSession(prev, id)),
      clearAll: () => apply(() => initialActivityState()),
    };
  }, [apply, ready, storageError, state]);

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used inside <ActivityProvider>');
  return ctx;
}
