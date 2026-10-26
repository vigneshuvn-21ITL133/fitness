/**
 * Blood pressure categories follow the 2017 ACC/AHA guideline.
 * This is information only, not a diagnosis.
 */

export type BpCategory = 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis';

export const BP_CATEGORY_LABEL: Record<BpCategory, string> = {
  normal: 'Normal',
  elevated: 'Elevated',
  stage1: 'High (stage 1)',
  stage2: 'High (stage 2)',
  crisis: 'Hypertensive crisis',
};

export const BP_NOTE =
  'This app does not diagnose conditions. Repeated readings above the normal range should be reviewed by a doctor. Seek urgent care for chest pain, breathlessness, weakness, confusion or vision changes.';

export function categorizeBp(systolic: number, diastolic: number): BpCategory {
  if (systolic > 180 || diastolic > 120) return 'crisis';
  if (systolic >= 140 || diastolic >= 90) return 'stage2';
  if (systolic >= 130 || diastolic >= 80) return 'stage1';
  if (systolic >= 120 && diastolic < 80) return 'elevated';
  return 'normal';
}

/** Average of readings, rounded to whole mmHg. Returns null for no readings. */
export function averageBp(
  readings: { systolic: number; diastolic: number }[],
): { systolic: number; diastolic: number } | null {
  if (readings.length === 0) return null;
  const sum = readings.reduce(
    (acc, r) => ({ systolic: acc.systolic + r.systolic, diastolic: acc.diastolic + r.diastolic }),
    { systolic: 0, diastolic: 0 },
  );
  return {
    systolic: Math.round(sum.systolic / readings.length),
    diastolic: Math.round(sum.diastolic / readings.length),
  };
}
