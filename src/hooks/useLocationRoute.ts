import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { RoutePoint } from '@/types';

export type LocationStatus = 'off' | 'permission-needed' | 'denied' | 'recording' | 'error';

interface Options {
  /** True only while a GPS session is actively recording (not paused, not stopped). */
  enabled: boolean;
  onPoint: (point: RoutePoint) => void;
}

/**
 * Streams foreground GPS points while `enabled` is true. Updates stop when
 * the screen unmounts, when recording pauses, or when the session ends.
 * Background location is not used.
 */
export function useLocationRoute({ enabled, onPoint }: Options) {
  const [status, setStatus] = useState<LocationStatus>('off');
  const [lastError, setLastError] = useState<string | null>(null);
  /** Accuracy of the most recent reading in metres, for showing why points are not yet kept. */
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted) return true;
      const asked = await Location.requestForegroundPermissionsAsync();
      if (!asked.granted) {
        setStatus('denied');
        return false;
      }
      return true;
    } catch (err) {
      setStatus('error');
      setLastError(err instanceof Error ? err.message : 'Location permission failed.');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus((prev) => (prev === 'recording' ? 'off' : prev));
      return;
    }
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const ok = await requestPermission();
      if (!ok || cancelled) return;
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 3,
          },
          (loc) => {
            const acc = loc.coords.accuracy;
            setLastAccuracy(typeof acc === 'number' && Number.isFinite(acc) ? acc : null);
            onPointRef.current({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              t: loc.timestamp,
              // Missing accuracy is treated as unusable rather than trusted.
              acc: loc.coords.accuracy ?? Number.POSITIVE_INFINITY,
            });
          },
          (err) => {
            setStatus('error');
            setLastError(String(err));
          },
        );
        if (cancelled) {
          subscription.remove();
          return;
        }
        setStatus('recording');
        setLastError(null);
      } catch (err) {
        setStatus('error');
        setLastError(err instanceof Error ? err.message : 'Could not start GPS.');
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled, requestPermission]);

  return { status, lastError, lastAccuracy, requestPermission };
}
