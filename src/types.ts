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
