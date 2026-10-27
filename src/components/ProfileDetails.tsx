import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { BmiScale } from '@/components/BmiScale';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { getBmiResult } from '@/domain/bmi';
import { latestWeight } from '@/domain/healthState';
import {
  CM_PER_INCH,
  formatHeight,
  formatWeight,
  kgPerInputUnit,
  kgToDisplay,
  weightUnitLabel,
} from '@/domain/units';
import {
  parseDecimal,
  validateAge,
  validateHeightCm,
  validateWeightKg,
  type Result,
} from '@/domain/validation';
import { pickAvatar, removeAvatarFile } from '@/lib/avatar';
import { useHealth } from '@/store/health-store';
import { useThemedStyles } from '@/store/theme-store';
import { spacing, type Palette } from '@/theme';
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

function heightForInput(cm: number, u: UnitSystem): string {
  return u === 'metric' ? String(Math.round(cm)) : String(Math.round(cm / CM_PER_INCH));
}

function weightForInput(kg: number, u: UnitSystem): string {
  return kgToDisplay(kg, u).toFixed(1);
}

/**
 * Editable personal details: photo, name, goal, units, age, height and current
 * weight. Saved values feed BMI, step distance and calorie estimates. Used on
 * the Settings screen.
 */
export function ProfileDetails() {
  const styles = useThemedStyles(makeStyles);
  const { state, saveProfile, addWeightEntry } = useHealth();
  const profile = state.profile;
  const latest = latestWeight(state.weights);

  const [units, setUnits] = useState<UnitSystem>(profile?.units ?? 'metric');
  const [nameInput, setNameInput] = useState(profile?.name ?? '');
  const [goalInput, setGoalInput] = useState(profile?.fitnessGoal ?? '');
  const [ageInput, setAgeInput] = useState(profile ? String(profile.age) : '');
  const [heightInput, setHeightInput] = useState(profile ? heightForInput(profile.heightCm, profile.units) : '');
  const [weightInput, setWeightInput] = useState(latest ? weightForInput(latest.kg, units) : '');
  const [errors, setErrors] = useState<{ age?: string; height?: string; weight?: string }>({});
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const bmi = useMemo(() => {
    if (!profile || !latest) return null;
    return getBmiResult(latest.kg, profile.heightCm, profile.age);
  }, [profile, latest]);

  const changePhoto = async () => {
    if (!profile) {
      setPhotoError('Save your age and height first, then add a photo.');
      return;
    }
    try {
      const uri = await pickAvatar(profile.avatarUri);
      if (uri) saveProfile({ ...profile, avatarUri: uri });
      setPhotoError(null);
    } catch {
      setPhotoError('The photo could not be saved. Try another image.');
    }
  };

  const removePhoto = () => {
    if (!profile) return;
    removeAvatarFile(profile.avatarUri);
    const { avatarUri: _removed, ...rest } = profile;
    saveProfile(rest);
  };

  const changeUnits = (next: UnitSystem) => {
    // Convert what is typed so the values keep their meaning in the new system.
    const parsedHeight = Number(heightInput.replace(',', '.'));
    if (heightInput.trim() !== '' && Number.isFinite(parsedHeight)) {
      if (units === 'metric' && next === 'imperial') setHeightInput(String(Math.round(parsedHeight / CM_PER_INCH)));
      if (units === 'imperial' && next === 'metric') setHeightInput(String(Math.round(parsedHeight * CM_PER_INCH)));
    }
    const parsedWeight = Number(weightInput.replace(',', '.'));
    if (weightInput.trim() !== '' && Number.isFinite(parsedWeight)) {
      const kg = parsedWeight * kgPerInputUnit(units);
      setWeightInput((kg / kgPerInputUnit(next)).toFixed(1));
    }
    setUnits(next);
    setSaved(false);
  };

  const save = () => {
    const age = validateAge(ageInput);
    const heightAsCm = units === 'metric' ? validateHeightCm(heightInput) : validateHeightInches(heightInput);
    const weight = weightInput.trim() === '' ? null : validateWeightKg(weightInput, kgPerInputUnit(units));

    const nextErrors: { age?: string; height?: string; weight?: string } = {};
    if (!age.ok) nextErrors.age = age.error;
    if (!heightAsCm.ok) nextErrors.height = heightAsCm.error;
    if (weight !== null && !weight.ok) nextErrors.weight = weight.error;
    setErrors(nextErrors);
    if (!age.ok || !heightAsCm.ok || (weight !== null && !weight.ok)) return;

    const name = nameInput.trim();
    const goal = goalInput.trim();
    saveProfile({
      age: age.value,
      heightCm: heightAsCm.value,
      units,
      ...(profile?.avatarUri ? { avatarUri: profile.avatarUri } : {}),
      ...(name ? { name: name.slice(0, 40) } : {}),
      ...(goal ? { fitnessGoal: goal.slice(0, 120) } : {}),
    });

    // A weight entry is added only when it differs from the latest one, so
    // saving unchanged details does not clutter the weight history.
    if (weight !== null && weight.ok && (!latest || Math.abs(weight.value - latest.kg) >= 0.05)) {
      addWeightEntry(weight.value);
    }
    setSaved(true);
  };

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.cardTitle}>Profile photo</Text>
        <View style={styles.photoRow}>
          {profile?.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} accessibilityLabel="Profile photo" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={styles.photoButtons}>
            <Button label={profile?.avatarUri ? 'Change photo' : 'Choose photo'} onPress={changePhoto} />
            {profile?.avatarUri ? (
              <Button label="Remove photo" variant="secondary" onPress={removePhoto} />
            ) : null}
          </View>
        </View>
        {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
        <Text style={styles.guidance}>Stored only on this device. Nothing is uploaded.</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Your details</Text>

        <FormField
          label="Name (optional)"
          value={nameInput}
          onChangeText={(t) => {
            setNameInput(t);
            setSaved(false);
          }}
          placeholder="e.g. Alex"
          keyboardType="default"
        />
        <FormField
          label="Fitness goal (optional)"
          value={goalInput}
          onChangeText={(t) => {
            setGoalInput(t);
            setSaved(false);
          }}
          placeholder="e.g. Walk 5 km three times a week"
          keyboardType="default"
        />

        <Text style={styles.label}>Units</Text>
        <View style={styles.unitsRow}>
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
        <FormField
          label={`Current weight (${weightUnitLabel(units)})`}
          value={weightInput}
          onChangeText={(t) => {
            setWeightInput(t);
            setSaved(false);
          }}
          placeholder={units === 'metric' ? 'e.g. 70' : 'e.g. 154'}
          suffix={weightUnitLabel(units)}
          error={errors.weight}
        />
        <Text style={styles.guidance}>
          Weight is saved as a dated entry when it changes. Height, age and weight are used for BMI,
          step distance and calorie estimates.
        </Text>
        <View style={styles.saveRow}>
          <Button label="Save details" onPress={save} />
        </View>
        {saved ? <Text style={styles.saved}>Details saved.</Text> : null}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Body Mass Index</Text>
        {!profile ? (
          <EmptyState title="Set up your details" body="Save your age and height to see your BMI." />
        ) : !latest ? (
          <EmptyState title="Add a weight" body="BMI uses your most recent weight entry." />
        ) : bmi ? (
          <View style={styles.bmiBody}>
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
        <Text style={styles.disclaimer}>
          BMI is a screening measure and does not measure body fat directly. It does not account for muscle,
          age or body shape in every case.
        </Text>
      </Card>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  stack: { gap: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  photoButtons: { flex: 1, gap: spacing.sm },
  avatarImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { color: colors.onAccent, fontSize: 26, fontWeight: '800' },
  photoError: { color: colors.red, fontSize: 12, marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  unitsRow: { marginBottom: spacing.lg },
  saveRow: { marginTop: spacing.sm },
  saved: { color: colors.mint, fontSize: 13, marginTop: spacing.md, textAlign: 'center' },
  bmiBody: { gap: spacing.md },
  bmiValue: { color: colors.text, fontSize: 36, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
  category: { color: colors.yellow, fontSize: 15, fontWeight: '600' },
  guidance: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  disclaimer: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: spacing.md },
});
