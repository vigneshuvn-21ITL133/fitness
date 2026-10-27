export type MoodKey = 'happy' | 'sad' | 'angry' | 'love' | 'neutral';

export const MOOD_KEYS: MoodKey[] = ['happy', 'sad', 'angry', 'love', 'neutral'];

export const MOOD_LABEL: Record<MoodKey, string> = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  love: 'Loved',
  neutral: 'Okay',
};

export type SleepStage = 'awake' | 'light' | 'deep';

export interface SleepSegment {
  stage: SleepStage;
  minutes: number;
}

export type RangeKey = 'Today' | 'Week' | 'Month' | 'Year';

export type UnitSystem = 'metric' | 'imperial';

export interface Profile {
  /** Age in whole years. Used to decide whether adult BMI categories apply. */
  age: number;
  heightCm: number;
  units: UnitSystem;
  /** Optional display name. */
  name?: string;
  /** Optional free-text fitness goal, e.g. "Walk 5 km three times a week". */
  fitnessGoal?: string;
  /** Local file URI of the profile photo, copied into app storage. */
  avatarUri?: string;
}

export interface WeightEntry {
  id: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Always stored in kilograms; converted for display. */
  kg: number;
  /** How this reading was obtained. */
  source: ReadingSource;
}

export interface BloodPressureEntry {
  id: string;
  /** ISO timestamp. */
  timestamp: string;
  systolic: number;
  diastolic: number;
  /** How this reading was obtained. */
  source: ReadingSource;
}

export type ReadingSource = 'manual' | 'healthkit' | 'health-connect' | 'derived';

export interface StepDay {
  /** Count read from the device pedometer for that day. */
  sensor?: number;
  /** Count entered by hand; takes priority over the sensor value. */
  manual?: number;
}

/**
 * How a heart-rate reading was obtained. 'manual' is typed by the user.
 * 'tap' is a count of the user's taps over 15 seconds, scaled to bpm. It is
 * not a sensor reading. A connected device is not yet supported.
 */
export type HeartRateSource = 'manual' | 'tap';

export interface HeartRateEntry {
  id: string;
  timestamp: string;
  bpm: number;
  source: HeartRateSource;
}

export interface HealthState {
  version: 1;
  profile: Profile | null;
  stepGoal: number;
  /** Keyed by local date YYYY-MM-DD. */
  steps: Record<string, StepDay>;
  weights: WeightEntry[];
  bloodPressure: BloodPressureEntry[];
  heartRate: HeartRateEntry[];
}

export interface RoutePoint {
  lat: number;
  lng: number;
  /** Epoch milliseconds. */
  t: number;
  /** Horizontal accuracy in metres as reported by the device. */
  acc: number;
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'interrupted';

export interface ActivitySession {
  id: string;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  /** Milliseconds of active (not paused) time already closed. */
  activeMs: number;
  /** Start of the current active run, or null while paused or finished. */
  runStartedAt: number | null;
  /** Start of the current step-counting window, or null while paused or finished. */
  stepRunStart: number | null;
  /** Steps from closed windows. */
  steps: number;
  /** Set when the user typed steps because no sensor was available. */
  manualSteps: number | null;
  /** Last time the session was saved while running. Used to recover after a crash. */
  lastSeenAt: number;
  gps: boolean;
  route: RoutePoint[];
  distanceM: number;
  /** Calories estimated when the session stopped. Kept even if the profile changes later. */
  kcal: number | null;
  /** Body weight used for that estimate. */
  kcalWeightKg: number | null;
}

export interface ActivityState {
  version: 1;
  sessions: ActivitySession[];
}
