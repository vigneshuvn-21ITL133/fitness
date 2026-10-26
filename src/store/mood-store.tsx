import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { addDays, startOfWeek, toDateKey } from '@/lib/date';
import type { MoodKey } from '@/types';

const STORAGE_KEY = 'pulse.moods.v1';

type MoodMap = Record<string, MoodKey>;

interface MoodContextValue {
  ready: boolean;
  moods: MoodMap;
  getMood: (date: Date) => MoodKey | undefined;
  setMood: (date: Date, mood: MoodKey) => void;
  clearMood: (date: Date) => void;
  resetAll: () => void;
}

const MoodContext = createContext<MoodContextValue | null>(null);

/** Starter entries for the current week so a fresh install isn't empty. */
function seedWeek(now: Date): MoodMap {
  const sunday = startOfWeek(now);
  const pattern: MoodKey[] = ['happy', 'sad', 'angry', 'love'];
  const seeded: MoodMap = {};
  pattern.forEach((mood, index) => {
    seeded[toDateKey(addDays(sunday, index))] = mood;
  });
  return seeded;
}

function isMoodMap(value: unknown): value is MoodMap {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === 'string',
  );
}

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [moods, setMoods] = useState<MoodMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw === null) {
          const seeded = seedWeek(new Date());
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
          if (!cancelled) setMoods(seeded);
        } else {
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
