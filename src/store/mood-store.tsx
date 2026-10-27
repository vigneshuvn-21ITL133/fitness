import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { canRecordMood, type MoodMap } from '@/domain/mood';
import { toDateKey } from '@/lib/date';
import type { MoodKey } from '@/types';

const STORAGE_KEY = 'pulse.moods.v1';

interface MoodContextValue {
  ready: boolean;
  moods: MoodMap;
  getMood: (date: Date) => MoodKey | undefined;
  /** Records a mood for today or a later day. Past days are ignored. */
  setMood: (date: Date, mood: MoodKey) => void;
  /** Clears a mood for today or a later day. Past days are ignored. */
  clearMood: (date: Date) => void;
  resetAll: () => void;
}

const MoodContext = createContext<MoodContextValue | null>(null);

function isMoodMap(value: unknown): value is MoodMap {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === 'string',
  );
}

/**
 * Moods start empty and are entered by hand from today onwards. Nothing is
 * pre-filled, so the statistics only reflect what the user has recorded.
 */
export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [moods, setMoods] = useState<MoodMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          if (!cancelled) setMoods(isMoodMap(parsed) ? parsed : {});
        }
      } catch {
        // Storage failure should never block the app; start empty.
        if (!cancelled) setMoods({});
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: MoodMap) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setMood = useCallback(
    (date: Date, mood: MoodKey) => {
      if (!canRecordMood(date)) return;
      setMoods((prev) => {
        const next = { ...prev, [toDateKey(date)]: mood };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearMood = useCallback(
    (date: Date) => {
      if (!canRecordMood(date)) return;
      setMoods((prev) => {
        const next = { ...prev };
        delete next[toDateKey(date)];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetAll = useCallback(() => {
    setMoods({});
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const getMood = useCallback(
    (date: Date) => moods[toDateKey(date)],
    [moods],
  );

  const value = useMemo<MoodContextValue>(
    () => ({ ready, moods, getMood, setMood, clearMood, resetAll }),
    [ready, moods, getMood, setMood, clearMood, resetAll],
  );

  return <MoodContext.Provider value={value}>{children}</MoodContext.Provider>;
}

export function useMoods(): MoodContextValue {
  const ctx = useContext(MoodContext);
  if (!ctx) throw new Error('useMoods must be used inside <MoodProvider>');
  return ctx;
}
