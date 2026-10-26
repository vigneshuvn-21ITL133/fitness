import type { SleepSegment } from '@/types';

/** Profile shown in the home header. */
export const USER = {
  name: 'Zihad',
  initials: 'Z',
};

/** Overall "Freud score" shown on the home dashboard (out of max). */
export const FREUD_SCORE = { value: 36, max: 375 };

/** Weight tracking. */
export const WEIGHT = {
  current: 75,
  unit: 'kg',
  target: 70,
  rulerMin: 60,
  rulerMax: 90,
};

/** Monthly growth figures for the home "Growth" card. */
export const GROWTH = {
  percent: 8.7,
  months: [
    { label: 'Jan', value: 0.55 },
    { label: 'Feb', value: 0.45 },
    { label: 'Mar', value: 0.85 },
    { label: 'Apr', value: 0.6 },
  ],
};

/** Mood statistic donut on the home screen. */
export const HAPPY_MINUTES = 235;
export const MOOD_SHARE = { happy: 0.65, sad: 0.22, angry: 0.13 } as const;

/** Health overview rings (outer → inner). Values are 0–1 progress. */
export const HEALTH_RINGS = [
  { key: 'stress', progress: 0.82 },
  { key: 'sleep', progress: 0.79 },
  { key: 'meditation', progress: 0.45 },
] as const;

export const HEALTH_STATS = {
  noStressDays: 56,
  sleepQualityPercent: 79,
  meditationDays: 23,
};

/** Work / life balance for today, in hours. */
export const WORK_LIFE = {
  workHours: 10.5,
  workGoal: 12,
  sleepHours: 5.5,
  sleepGoal: 8,
};

/** Sleep screen data. */
export const SLEEP_SCORE = 84;

/**
 * One night of sleep as consecutive stage blocks (chronological).
 * Total in-bed time is ~9h18m, starting 22:28.
 */
export const SLEEP_SEGMENTS: SleepSegment[] = [
  { stage: 'awake', minutes: 8 },
  { stage: 'light', minutes: 45 },
  { stage: 'deep', minutes: 60 },
  { stage: 'light', minutes: 30 },
  { stage: 'awake', minutes: 4 },
  { stage: 'deep', minutes: 40 },
  { stage: 'light', minutes: 90 },
  { stage: 'awake', minutes: 6 },
  { stage: 'light', minutes: 50 },
  { stage: 'deep', minutes: 55 },
  { stage: 'light', minutes: 70 },
  { stage: 'awake', minutes: 10 },
  { stage: 'light', minutes: 60 },
  { stage: 'deep', minutes: 30 },
];

export const SLEEP_START = { hour: 22, minute: 28 };
export const SLEEP_END_LABEL = '7:46 AM';
export const SLEEP_START_LABEL = '10:28 PM';

/** Irregularity and resting heart rate, shown as stat tiles. */
export const SLEEP_META = {
  irregularDays: 4,
  restingHr: 48,
};
