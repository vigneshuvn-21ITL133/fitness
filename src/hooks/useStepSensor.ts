import { Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

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
 *
 * `canAskAgain` is false once the user has denied motion access and the
 * system will no longer show the prompt. The screen then has to send the user
 * to system settings instead of asking again.
 */
export function useStepSensor({ onSteps }: Options) {
  const [status, setStatus] = useState<StepSensorStatus>('checking');
  const [lastError, setLastError] = useState<string | null>(null);
  const [canAskAgain, setCanAskAgain] = useState<boolean | null>(null);
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

  /** Checks the current permission and starts counting if it is granted. */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    const permission = await Pedometer.getPermissionsAsync();
    setCanAskAgain(permission.canAskAgain);
    if (!permission.granted) {
      // Denied with no further prompt means the screen must send the user to settings.
      setStatus(permission.canAskAgain === false ? 'denied' : 'permission-needed');
      return false;
    }
    await refresh();
    return true;
  }, [refresh]);

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
        const granted = await checkPermission();
        if (cancelled || !granted) return;
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
  }, [checkPermission, refresh]);

  // Users often grant access in system settings and come back. Re-check then,
  // so the screen updates without a restart.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (status !== 'permission-needed' && status !== 'denied') return;
      checkPermission().catch(() => {
        // Ignore: the next user action shows any error.
      });
    });
    return () => sub.remove();
  }, [status, checkPermission]);

  const requestPermission = useCallback(async () => {
    try {
      const response = await Pedometer.requestPermissionsAsync();
      setCanAskAgain(response.canAskAgain);
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

  /** Re-checks permission and reads steps again, e.g. after an error. */
  const retry = useCallback(async () => {
    try {
      await checkPermission();
    } catch (err) {
      setStatus('error');
      setLastError(err instanceof Error ? err.message : 'Step sensor failed.');
    }
  }, [checkPermission]);

  return { status, lastError, canAskAgain, requestPermission, refresh, retry };
}
