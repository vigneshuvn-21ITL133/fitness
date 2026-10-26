import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BmiScale } from '@/components/BmiScale';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { getBmiResult } from '@/domain/bmi';
import { latestWeight } from '@/domain/healthState';
import { CM_PER_INCH, formatHeight, formatWeight } from '@/domain/units';
import { parseDecimal, validateAge, validateHeightCm, type Result } from '@/domain/validation';
import { useHealth } from '@/store/health-store';
import { colors, spacing } from '@/theme';
import type { UnitSystem } from '@/types';

const UNIT_OPTIONS = ['metric', 'imperial'] as const;

const MIN_INCHES = Math.ceil(100 / CM_PER_INCH);
const MAX_INCHES = Math.floor(250 / CM_PER_INCH);

/** Validates height typed in inches and returns it in centimetres. */
function validateHeightInches(input: string): Result<number> {
  if (input.trim() === '') return { ok: false, error: 'Height is required.' };
  const inches = parseDecimal(input);
  if (inches === null) return { ok: false, error: 'Height must be a number.' };
  if (inches < MIN_INCHES || inches > MAX_INCHES) {
    return { ok: false, error: `Height must be between ${MIN_INCHES} and ${MAX_INCHES} in.` };
  }
  return { ok: true, value: Math.round(inches * CM_PER_INCH * 10) / 10 };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, saveProfile } = useHealth();
  const profile = state.profile;
  const latest = latestWeight(state.weights);

  const [units, setUnits] = useState<UnitSystem>(profile?.units ?? 'metric');
  const [ageInput, setAgeInput] = useState(profile ? String(profile.age) : '');
  const [heightInput, setHeightInput] = useState(
    profile ? heightForInput(profile.heightCm, profile.units) : '',
  );
  const [errors, setErrors] = useState<{ age?: string; height?: string }>({});
  const [saved, setSaved] = useState(false);

  const bmi = useMemo(() => {
    if (!profile || !latest) return null;
    return getBmiResult(latest.kg, profile.heightCm, profile.age);
  }, [profile, latest]);

  function heightForInput(cm: number, u: UnitSystem): string {
    return u === 'metric' ? String(Math.round(cm)) : String(Math.round(cm / CM_PER_INCH));
  }

  const changeUnits = (next: UnitSystem) => {
    // Keep the typed height meaningful when switching systems.
    const parsed = Number(heightInput.replace(',', '.'));
    if (heightInput.trim() !== '' && Number.isFinite(parsed)) {
      if (units === 'metric' && next === 'imperial') setHeightInput(String(Math.round(parsed / CM_PER_INCH)));
      if (units === 'imperial' && next === 'metric') setHeightInput(String(Math.round(parsed * CM_PER_INCH)));
    }
    setUnits(next);
    setSaved(false);
  };

  const save = () => {
    const age = validateAge(ageInput);
    const heightAsCm = units === 'metric' ? validateHeightCm(heightInput) : validateHeightInches(heightInput);
    const nextErrors: { age?: string; height?: string } = {};
    if (!age.ok) nextErrors.age = age.error;
    if (!heightAsCm.ok) nextErrors.height = heightAsCm.error;
    setErrors(nextErrors);
    if (!age.ok || !heightAsCm.ok) return;

    saveProfile({ age: age.value, heightCm: heightAsCm.value, units });
    setSaved(true);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Card>
          <Text style={styles.cardTitle}>Your details</Text>

          <Text style={styles.label}>Units</Text>
          <View style={{ marginBottom: spacing.lg }}>
            <SegmentedControl options={UNIT_OPTIONS} value={units} onChange={changeUnits} />
          </View>

          <FormField
            label="Age (years)"
            value={ageInput}
            onChangeText={(t) => {
              setAgeInput(t);
              setSaved(false);
            }}
            placeholder="e.g. 16"
            suffix="years"
            error={errors.age}
            keyboardType="number-pad"
          />
          <FormField
            label={units === 'metric' ? 'Height (cm)' : 'Height (in)'}
            value={heightInput}
            onChangeText={(t) => {
              setHeightInput(t);
              setSaved(false);
            }}
            placeholder={units === 'metric' ? 'e.g. 170' : 'e.g. 67'}
            suffix={units === 'metric' ? 'cm' : 'in'}
            error={errors.height}
          />
          <Button label="Save profile" onPress={save} />
          {saved ? <Text style={styles.saved}>Profile saved.</Text> : null}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Body Mass Index</Text>
          {!profile ? (
            <EmptyState title="Set up your profile" body="Save your age and height to see your BMI." />
          ) : !latest ? (
            <EmptyState title="Add a weight" body="BMI uses your most recent weight entry." />
          ) : bmi ? (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.bmiValue}>{bmi.bmi.toFixed(1)}</Text>
              <Text style={styles.meta}>
                {formatWeight(latest.kg, profile.units)} · {formatHeight(profile.heightCm, profile.units)}
              </Text>
              {bmi.kind === 'adult' ? (
                <>
                  <Text style={styles.category}>{bmi.label}</Text>
                  <BmiScale bmi={bmi.bmi} />
                </>
              ) : (
                <Text style={styles.category}>Under 18: adult categories not shown</Text>
              )}
              <Text style={styles.guidance}>{bmi.guidance}</Text>
            </View>
          ) : null}
        </Card>

        <Text style={styles.disclaimer}>
          BMI is a screening measure and does not measure body fat directly. It does not account for muscle,
          age or body shape in every case.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  saved: { color: colors.mint, fontSize: 13, marginTop: spacing.md, textAlign: 'center' },
  bmiValue: { color: colors.text, fontSize: 36, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
  category: { color: colors.yellow, fontSize: 15, fontWeight: '600' },
  guidance: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  disclaimer: { color: colors.textFaint, fontSize: 11, lineHeight: 16 },
});
