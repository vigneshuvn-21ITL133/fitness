/** Mood rules: what can be recorded, and how logged moods are summarised. Pure functions. */
import { startOfDay, toDateKey } from '@/lib/date';
import type { MoodKey } from '@/types';

export type MoodMap = Record<string, MoodKey>;

/**
 * Moods are entered by hand, starting today. Days before today can't be added
 * or changed, so only the user's own entries count in the statistics.
 */
export function canRecordMood(date: Date, now: Date = new Date()): boolean {
  return toDateKey(date) >= toDateKey(startOfDay(now));
}

export type MoodGroupKey = 'happy' | 'sad' | 'angry' | 'okay';

export interface MoodGroup {
  key: MoodGroupKey;
  label: string;
  count: number;
  /** Fraction of logged days, 0..1. */
  share: number;
}

/**
 * Groups logged moods for the home donut. Loved counts as happy and Okay is
 * its own group. Groups with no entries are left out.
 */
export function moodGroups(moods: MoodMap): { total: number; groups: MoodGroup[] } {
  const counts: Record<MoodGroupKey, number> = { happy: 0, sad: 0, angry: 0, okay: 0 };
  let total = 0;
  for (const mood of Object.values(moods)) {
    total += 1;
    if (mood === 'happy' || mood === 'love') counts.happy += 1;
    else if (mood === 'sad') counts.sad += 1;
    else if (mood === 'angry') counts.angry += 1;
    else if (mood === 'neutral') counts.okay += 1;
  }
  const labels: Record<MoodGroupKey, string> = {
    happy: 'Happy',
    sad: 'Sad',
    angry: 'Angry',
    okay: 'Okay',
  };
  const order: MoodGroupKey[] = ['happy', 'sad', 'angry', 'okay'];
  const groups = order
    .filter((key) => counts[key] > 0)
    .map((key) => ({
      key,
      label: labels[key],
      count: counts[key],
      share: total === 0 ? 0 : counts[key] / total,
    }));
  return { total, groups };
}
