import type { UnitSystem } from '@/types';

export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;

export function kgToDisplay(kg: number, units: UnitSystem): number {
  return units === 'metric' ? kg : kg / KG_PER_LB;
}

export function weightUnitLabel(units: UnitSystem): 'kg' | 'lb' {
  return units === 'metric' ? 'kg' : 'lb';
}

/** Factor that converts a value typed in the active weight unit into kilograms. */
export function kgPerInputUnit(units: UnitSystem): number {
  return units === 'metric' ? 1 : KG_PER_LB;
}

export function formatWeight(kg: number, units: UnitSystem): string {
  return `${kgToDisplay(kg, units).toFixed(1)} ${weightUnitLabel(units)}`;
}

export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet} ft ${inches} in`;
}

/** Signed change for display, e.g. "+1.2 kg" or "-0.5 lb". */
export function formatChange(kgDelta: number, units: UnitSystem): string {
  const value = kgToDisplay(kgDelta, units);
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} ${weightUnitLabel(units)}`;
}
