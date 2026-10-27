/**
 * Suggestions built on this device from the user's own records. Rules only:
 * no data leaves the phone and no model is called. Each suggestion gives a
 * general habit and the health benefit it supports. This is not medical advice.
 */
import { categorizeBp } from '@/domain/bloodPressure';
import type { MoodKey } from '@/types';

export type SuggestionKind = 'activity' | 'mood' | 'heart' | 'blood-pressure' | 'weight';

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  title: string;
  body: string;
  /** The health benefit the habit supports, in plain language. */
  benefit: string;
}

export interface SuggestionInputs {
  stepsToday: number;
  stepGoal: number;
  /** Moods logged in the current week, Sunday to today. */
  moodsThisWeek: MoodKey[];
  latestBp: { systolic: number; diastolic: number } | null;
  latestHeartRate: number | null;
  /** Adult BMI category, or null for minors and when height or weight is missing. */
  bmiCategory: 'underweight' | 'healthy' | 'overweight' | 'obesity' | null;
}

const NEGATIVE: MoodKey[] = ['sad', 'angry'];

export function buildSuggestions(input: SuggestionInputs): Suggestion[] {
  const list: Suggestion[] = [];

  // Activity
  if (input.stepGoal > 0 && input.stepsToday < input.stepGoal * 0.5) {
    list.push({
      id: 'activity-low',
      kind: 'activity',
      title: 'Add a short walk today',
      body: `You are at ${input.stepsToday.toLocaleString('en-US')} of ${input.stepGoal.toLocaleString('en-US')} steps. A 15-minute walk is about 1,500 to 2,000 steps.`,
      benefit: 'Regular walking supports heart and circulation health and can lift mood.',
    });
  } else if (input.stepGoal > 0 && input.stepsToday >= input.stepGoal) {
    list.push({
      id: 'activity-goal',
      kind: 'activity',
      title: 'Step goal reached',
      body: 'Well done. Consistent days like this add up over the week.',
      benefit: 'Consistency matters more than one big day for long-term fitness.',
    });
  }

  // Mood
  const logged = input.moodsThisWeek.length;
  const negative = input.moodsThisWeek.filter((m) => NEGATIVE.includes(m)).length;
  if (logged >= 3 && negative / logged >= 0.5) {
    list.push({
      id: 'mood-low',
      kind: 'mood',
      title: 'Several lower days this week',
      body: 'Try a short walk or a call with someone you trust, and note what helped on a good day.',
      benefit: 'Physical activity and social contact are linked with better mood.',
    });
  }

  // Blood pressure
  if (input.latestBp) {
    const category = categorizeBp(input.latestBp.systolic, input.latestBp.diastolic);
    if (category === 'crisis') {
      list.push({
        id: 'bp-crisis',
        kind: 'blood-pressure',
        title: 'Seek urgent medical help',
        body: 'This reading is very high. If you have chest pain, breathlessness, severe headache, weakness, confusion or vision changes, call emergency services now.',
        benefit: 'Prompt review of very high readings helps protect the heart and blood vessels.',
      });
    } else if (category === 'stage1' || category === 'stage2' || category === 'elevated') {
      list.push({
        id: 'bp-high',
        kind: 'blood-pressure',
        title: 'Blood pressure is above normal',
        body: 'Keep a log at similar times, seated and rested, and show it to a clinician.',
        benefit: 'Tracking trends helps a clinician decide what, if anything, to do next.',
      });
    }
  }

  // Heart rate
  if (input.latestHeartRate !== null) {
    if (input.latestHeartRate > 100) {
      list.push({
        id: 'heart-high',
        kind: 'heart',
        title: 'Resting heart rate is high',
        body: 'Recheck when you are seated and rested. If it stays above 100, talk to a clinician.',
        benefit: 'A steady resting heart rate is a useful trend to share at appointments.',
      });
    } else if (input.latestHeartRate < 50) {
      list.push({
        id: 'heart-low',
        kind: 'heart',
        title: 'Resting heart rate is low',
        body: 'If you feel dizzy, faint or unusually tired, speak to a clinician. Athletes often have low resting rates.',
        benefit: 'Knowing your usual range helps you notice changes early.',
      });
    }
  }

  // Weight (adults only)
  if (input.bmiCategory === 'overweight' || input.bmiCategory === 'obesity') {
    list.push({
      id: 'weight-high',
      kind: 'weight',
      title: 'Build activity and balanced meals gradually',
      body: 'Small, steady changes are easier to keep than a large change all at once.',
      benefit: 'A modest weight reduction can help blood pressure and blood sugar for many people.',
    });
  } else if (input.bmiCategory === 'underweight') {
    list.push({
      id: 'weight-low',
      kind: 'weight',
      title: 'Talk to a clinician about your weight',
      body: 'A BMI below the healthy range can be worth checking with a doctor or dietitian.',
      benefit: 'Adequate nutrition supports energy, immunity and recovery.',
    });
  }

  if (list.length === 0) {
    list.push({
      id: 'keep-logging',
      kind: 'activity',
      title: 'Keep logging',
      body: 'Log your steps, mood and readings to get suggestions based on your own patterns.',
      benefit: 'Regular tracking helps you notice patterns early.',
    });
  }

  return list;
}
