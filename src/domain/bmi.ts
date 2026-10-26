/**
 * Body Mass Index. Adult categories (WHO) apply from age 18.
 * Under-18s are not given an adult category: BMI for children should be
 * read against age- and sex-specific percentile charts.
 */

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obesity';

export type BmiResult =
  | {
      kind: 'adult';
      bmi: number;
      category: BmiCategory;
      label: string;
      guidance: string;
    }
  | {
      kind: 'minor';
      bmi: number;
      guidance: string;
    };

export const MINOR_AGE = 18;

/** kg / m². Caller must have validated the inputs. */
export function computeBmi(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'healthy';
  if (bmi < 30) return 'overweight';
  return 'obesity';
}

const ADULT_LABEL: Record<BmiCategory, string> = {
  underweight: 'Underweight',
  healthy: 'Healthy weight',
  overweight: 'Overweight',
  obesity: 'Obesity',
};

const ADULT_GUIDANCE: Record<BmiCategory, string> = {
  underweight: 'Your BMI is below 18.5. Speak with a doctor or dietitian if weight loss is unplanned.',
  healthy: 'Your BMI is in the 18.5–24.9 range. Keep up regular activity and balanced meals.',
  overweight: 'Your BMI is in the 25–29.9 range. Small, steady changes to food and activity can help.',
  obesity: 'Your BMI is 30 or higher. A doctor can help you plan next steps.',
};

export function getBmiResult(weightKg: number, heightCm: number, age: number): BmiResult {
  const bmi = computeBmi(weightKg, heightCm);
  if (age < MINOR_AGE) {
    return {
      kind: 'minor',
      bmi,
      guidance:
        'Adult BMI categories do not apply under 18. Children and teens are compared with age- and sex-based charts. Ask a doctor to interpret this number.',
    };
  }
  const category = bmiCategory(bmi);
  return {
    kind: 'adult',
    bmi,
    category,
    label: ADULT_LABEL[category],
    guidance: ADULT_GUIDANCE[category],
  };
}
