/**
 * Tap-count heart-rate measurement. The user taps once per beat during a fixed
 * window and the tap count is scaled to beats per minute. This counts what the
 * user tapped; it is not a sensor reading. Pure functions, no UI.
 */
import { LIMITS, type Result } from '@/domain/validation';

export const TAP_WINDOW_SECONDS = 15;

/** Beats per minute from a tap count over the window (taps × 60 / window). */
export function tapsToBpm(taps: number, windowSeconds = TAP_WINDOW_SECONDS): number {
  if (!Number.isFinite(taps) || taps < 0 || windowSeconds <= 0) return 0;
  return Math.round((taps * 60) / windowSeconds);
}

/** Checks the tap count gives a value inside the same range as typed readings. */
export function validateTapCount(taps: number): Result<number> {
  const bpm = tapsToBpm(taps);
  if (bpm < LIMITS.heartRate.min || bpm > LIMITS.heartRate.max) {
    return {
      ok: false,
      error: `${taps} taps gives ${bpm} bpm, outside ${LIMITS.heartRate.min}–${LIMITS.heartRate.max}. Count again.`,
    };
  }
  return { ok: true, value: bpm };
}
