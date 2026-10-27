import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { RoutePoint } from '@/types';

export type LocationStatus = 'off' | 'permission-needed' | 'denied' | 'recording' | 'error';

/** Where the device is now. Shown on the map even before any route point is kept. */
export interface CurrentFix {
  lat: number;
  lng: number;
  /** Accuracy in metres, or null when the device did not report it. */
  acc: number | null;
}

interface Options {
  /** True only while a GPS session is actively recording (not paused, not stopped). */
  enabled: boolean;
  onPoint: (point: RoutePoint) => void;
}

function accuracyOf(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Streams foreground GPS points while `enabled` is true. Updates stop when
 * the screen unmounts, when recording pauses, or when the session ends.
 * Background location is not used.
 *
 * `current` is the device's position for the map. It is fetched once straight
 * away, so the map can centre on you while GPS settles, and then follows the
 * live readings. Only readings that pass the accuracy filter become route points.
 */
export function useLocationRoute({ enabled, onPoint }: Options) {
  const [status, setStatus] = useState<LocationStatus>('off');
  const [lastError, setLastError] = useState<string | null>(null);
  /** Accuracy of the most recent reading in metres, for showing why points are not yet kept. */
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [current, setCurrent] = useState<CurrentFix | null>(null);
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.granted) return true;
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

      // Immediate fix from the best available source (GPS, Wi-Fi or network),
      // so the map shows where you are while the live GPS fix is still searching.
      try {
        const first = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          const acc = accuracyOf(first.coords.accuracy);
          setCurrent({ lat: first.coords.latitude, lng: first.coords.longitude, acc });
          setLastAccuracy(acc);
        }
      } catch {
        // Not fatal: the live watch below may still deliver a fix.
      }

      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 3,
          },
          (loc) => {
            const acc = accuracyOf(loc.coords.accuracy);
            setLastAccuracy(acc);
            setCurrent({ lat: loc.coords.latitude, lng: loc.coords.longitude, acc });
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

  return { status, lastError, lastAccuracy, current, requestPermission };
}
