import { Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toDateKey } from '@/lib/date';

export type StepSensorStatus =
  | 'checking'
  | 'unavailable'
  | 'permission-needed'
  | 'denied'
  | 'ready'
  | 'error';

interface Options {
  /** Called with today's key and step count whenever the sensor reports. */
  onSteps: (dayKey: string, count: number) => void;
}

/**
 * Reads today's steps from the device pedometer and keeps them updated while
 * the app is open. Steps are read from local midnight to now, so the count
 * resets at the local day boundary.
 */
export function useStepSensor({ onSteps }: Options) {
  const [status, setStatus] = useState<StepSensorStatus>('checking');
  const [lastError, setLastError] = useState<string | null>(null);
  const onStepsRef = useRef(onSteps);
  onStepsRef.current = onSteps;

  const refresh = useCallback(async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const result = await Pedometer.getStepCountAsync(startOfDay, now);
      onStepsRef.current(toDateKey(now), result.steps);
      setStatus('ready');
      setLastError(null);
    } catch (err) {
      setStatus('error');
      setLastError(err instanceof Error ? err.message : 'Step sensor failed.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    (async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (cancelled) return;
        if (!available) {
          setStatus('unavailable');
          return;
        }
        const permission = await Pedometer.getPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          setStatus('permission-needed');
          return;
        }
        await refresh();
        if (cancelled) return;
        subscription = Pedometer.watchStepCount(() => {
          refresh();
        });
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setLastError(err instanceof Error ? err.message : 'Step sensor failed.');
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    try {
      const response = await Pedometer.requestPermissionsAsync();
      if (!response.granted) {
        setStatus('denied');
        return;
      }
      await refresh();
    } catch (err) {
      setStatus('error');
      setLastError(err instanceof Error ? err.message : 'Permission request failed.');
    }
  }, [refresh]);

  return { status, lastError, requestPermission, refresh };
}
