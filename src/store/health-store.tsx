import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  addBloodPressure,
  addHeartRate,
  addWeight,
  deleteBloodPressure,
  deleteHeartRate,
  deleteWeight,
  initialHealthState,
  sanitizeHealthState,
  setManualSteps,
  setProfile,
  setSensorSteps,
  setStepGoal,
  updateBloodPressure,
  updateWeight,
} from '@/domain/healthState';
import type { BloodPressureEntry, HealthState, HeartRateEntry, Profile, WeightEntry } from '@/types';

const STORAGE_KEY = 'pulse.health.v1';

interface HealthContextValue {
  ready: boolean;
  /** Set when storage could not be read or written. The app still works in memory. */
  storageError: string | null;
  state: HealthState;
  saveProfile: (profile: Profile) => void;
  saveStepGoal: (goal: number) => void;
  setManual: (dayKey: string, count: number | null) => void;
  setSensor: (dayKey: string, count: number) => void;
  addWeightEntry: (kg: number, timestamp?: string) => void;
  editWeightEntry: (id: string, kg: number) => void;
  removeWeightEntry: (id: string) => void;
  addBpEntry: (systolic: number, diastolic: number, timestamp?: string) => void;
  editBpEntry: (id: string, systolic: number, diastolic: number) => void;
  removeBpEntry: (id: string) => void;
  addHrEntry: (bpm: number, timestamp?: string) => void;
  removeHrEntry: (id: string) => void;
  resetHealth: () => void;
}

const HealthContext = createContext<HealthContextValue | null>(null);

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HealthState>(initialHealthState);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  // Mirrors state synchronously so back-to-back updates persist in order.
  const latest = useRef<HealthState>(state);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const loaded = raw === null ? initialHealthState() : sanitizeHealthState(JSON.parse(raw));
        if (!cancelled) {
          latest.current = loaded;
          setState(loaded);
        }
      } catch {
        if (!cancelled) setStorageError('Saved health data could not be loaded.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback((next: (prev: HealthState) => HealthState) => {
    const updated = next(latest.current);
    latest.current = updated;
    setState(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      .then(() => setStorageError(null))
      .catch(() => setStorageError('Changes could not be saved on this device.'));
  }, []);

  const value = useMemo<HealthContextValue>(
    () => ({
      ready,
      storageError,
      state,
      saveProfile: (profile) => apply((s) => setProfile(s, profile)),
      saveStepGoal: (goal) => apply((s) => setStepGoal(s, goal)),
      setManual: (dayKey, count) => apply((s) => setManualSteps(s, dayKey, count)),
      setSensor: (dayKey, count) => apply((s) => setSensorSteps(s, dayKey, count)),
      addWeightEntry: (kg, timestamp = new Date().toISOString()) => {
        const entry: WeightEntry = { id: newId(), timestamp, kg };
        apply((s) => addWeight(s, entry));
      },
      editWeightEntry: (id, kg) => apply((s) => updateWeight(s, id, kg)),
      removeWeightEntry: (id) => apply((s) => deleteWeight(s, id)),
      addBpEntry: (systolic, diastolic, timestamp = new Date().toISOString()) => {
        const entry: BloodPressureEntry = { id: newId(), timestamp, systolic, diastolic };
        apply((s) => addBloodPressure(s, entry));
      },
      editBpEntry: (id, systolic, diastolic) =>
        apply((s) => updateBloodPressure(s, id, systolic, diastolic)),
      removeBpEntry: (id) => apply((s) => deleteBloodPressure(s, id)),
      addHrEntry: (bpm, timestamp = new Date().toISOString()) => {
        const entry: HeartRateEntry = { id: newId(), timestamp, bpm, source: 'manual' };
        apply((s) => addHeartRate(s, entry));
      },
      removeHrEntry: (id) => apply((s) => deleteHeartRate(s, id)),
      resetHealth: () => {
        apply(() => initialHealthState());
      },
    }),
    [ready, storageError, state, apply],
  );

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth(): HealthContextValue {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used inside <HealthProvider>');
  return ctx;
}
