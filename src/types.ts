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
}

export interface WeightEntry {
  id: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Always stored in kilograms; converted for display. */
  kg: number;
}

export interface BloodPressureEntry {
  id: string;
  /** ISO timestamp. */
  timestamp: string;
  systolic: number;
  diastolic: number;
}

export interface StepDay {
  /** Count read from the device pedometer for that day. */
  sensor?: number;
  /** Count entered by hand; takes priority over the sensor value. */
  manual?: number;
}

export interface HealthState {
  version: 1;
  profile: Profile | null;
  stepGoal: number;
  /** Keyed by local date YYYY-MM-DD. */
  steps: Record<string, StepDay>;
  weights: WeightEntry[];
  bloodPressure: BloodPressureEntry[];
}
