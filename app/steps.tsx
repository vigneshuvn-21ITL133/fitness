import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormField } from '@/components/FormField';
import { GrowthBars } from '@/components/GrowthBars';
import { RingChart } from '@/components/RingChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  effectiveSteps,
  estimateCalories,
  estimateDistanceKm,
  goalProgress,
  weeklySteps,
} from '@/domain/steps';
import { latestWeight } from '@/domain/healthState';
import { validateSteps, validateStepGoal } from '@/domain/validation';
import { useStepSensor, type StepSensorStatus } from '@/hooks/useStepSensor';
import { WEEKDAY_SHORT, toDateKey } from '@/lib/date';
import { useHealth } from '@/store/health-store';
import { colors, spacing } from '@/theme';

const STATUS_TEXT: Record<StepSensorStatus, string> = {
  checking: 'Checking the step sensor…',
  unavailable: 'This device has no step sensor. Enter your steps manually below.',
  'permission-needed': 'Allow motion access so steps can be counted automatically.',
  denied: 'Motion access is off. Enable it in system settings, or enter steps manually.',
  ready: 'Counting steps from your device sensor.',
  error: 'The step sensor returned an error. You can still enter steps manually.',
};

export default function StepsScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { state, setSensor, setManual, saveStepGoal } = useHealth();

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const todayEntry = state.steps[todayKey];
  const steps = effectiveSteps(todayEntry);
  const goal = state.stepGoal;
  const progress = goalProgress(steps, goal);

  const profileHeight = state.profile?.heightCm;
  const weightKg = latestWeight(state.weights)?.kg;
  const distanceKm = estimateDistanceKm(steps, profileHeight);
  const calories = estimateCalories(steps, weightKg);

  const { status, lastError, canAskAgain, requestPermission } = useStepSensor({
    onSteps: (dayKey, count) => setSensor(dayKey, count),
  });

  // Once denied with "don't ask again", Android and iOS show no prompt, so the
  // only way to enable access is in system settings.
  const needsSettings = status === 'denied' && canAskAgain === false;
  const onAllowPress = () => {
    if (needsSettings) {
      Linking.openSettings().catch(() => {
        // Ignore: some devices cannot open the app's settings page.
      });
      return;
    }
    requestPermission();
  };

  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState(String(goal));
  const [goalError, setGoalError] = useState<string | null>(null);
  const [goalSaved, setGoalSaved] = useState(false);

  const week = weeklySteps(state.steps, today, 7);
  const weekMax = Math.max(goal, ...week.map((d) => d.count));

  const saveManual = () => {
    const result = validateSteps(manualInput);
    if (!result.ok) {
      setManualError(result.error);
      return;
    }
    setManual(todayKey, result.value);
    setManualInput('');
    setManualError(null);
  };

  const saveGoal = () => {
    const result = validateStepGoal(goalInput);
    if (!result.ok) {
      setGoalError(result.error);
      setGoalSaved(false);
      return;
    }
    saveStepGoal(result.value);
    setGoalError(null);
    setGoalSaved(true);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Steps" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Card>
          <Text style={styles.statusText}>{STATUS_TEXT[status]}</Text>
          {status === 'error' && lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}
          {status === 'permission-needed' || status === 'denied' ? (
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={needsSettings ? 'Open app settings' : 'Allow motion access'}
                onPress={onAllowPress}
              />
            </View>
          ) : null}
        </Card>

        <Card style={styles.today}>
          <RingChart
            size={170}
            strokeWidth={16}
            rings={[{ progress, color: colors.mint }]}
          >
            <View style={styles.ringCenter}>
              <Text style={styles.stepCount}>{steps.toLocaleString('en-US')}</Text>
              <Text style={styles.stepLabel}>of {goal.toLocaleString('en-US')} steps</Text>
            </View>
          </RingChart>
          <View style={styles.estimates}>
            <Estimate label="Distance (est.)" value={`${distanceKm.toFixed(2)} km`} />
            <Estimate label="Energy (est.)" value={`${calories} kcal`} />
            <Estimate label="Goal reached" value={`${Math.round(progress * 100)}%`} />
          </View>
          <Text style={styles.disclaimer}>
            Distance and energy are rough estimates from height and weight, not measurements.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Enter steps manually</Text>
          <Text style={styles.helper}>
            A manual entry replaces the sensor count for today. Use it when the sensor is unavailable or
            you want to correct the count.
          </Text>
          <FormField
            label="Steps today"
            value={manualInput}
            onChangeText={(t) => {
              setManualInput(t);
              setManualError(null);
            }}
            placeholder="e.g. 8500"
            suffix="steps"
            error={manualError}
            keyboardType="number-pad"
          />
          <View style={styles.actions}>
            <Button label="Save steps" onPress={saveManual} style={styles.grow} />
            {todayEntry?.manual !== undefined ? (
              <Button
                label="Use sensor"
                variant="secondary"
                onPress={() => setManual(todayKey, null)}
                style={styles.grow}
              />
            ) : null}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Daily goal</Text>
          <FormField
            label="Goal (steps per day)"
            value={goalInput}
            onChangeText={(t) => {
              setGoalInput(t);
              setGoalError(null);
              setGoalSaved(false);
            }}
            placeholder="10000"
            suffix="steps"
            error={goalError}
            keyboardType="number-pad"
          />
          <Button label="Save goal" onPress={saveGoal} />
          {goalSaved ? <Text style={styles.savedText}>Goal saved.</Text> : null}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Last 7 days</Text>
          <View style={{ marginTop: spacing.md }}>
            <GrowthBars
              items={week.map((d) => ({
                label: WEEKDAY_SHORT[d.date.getDay()].slice(0, 2),
                value: weekMax > 0 ? d.count / weekMax : 0,
              }))}
              color={colors.mint}
            />
          </View>
          <View style={styles.weekList}>
            {week.map((d) => (
              <View key={d.key} style={styles.weekRow}>
                <Text style={styles.weekDay}>{d.key}</Text>
                <Text style={styles.weekCount}>{d.count.toLocaleString('en-US')}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function Estimate({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.estimate}>
      <Text style={styles.estimateValue}>{value}</Text>
      <Text style={styles.estimateLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  statusText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  errorText: { color: colors.red, fontSize: 12, marginTop: spacing.sm },
  today: { alignItems: 'center' },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepCount: { color: colors.text, fontSize: 28, fontWeight: '700' },
  stepLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  estimates: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: spacing.lg },
  estimate: { alignItems: 'center' },
  estimateValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  estimateLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  disclaimer: { color: colors.textFaint, fontSize: 11, marginTop: spacing.md, textAlign: 'center' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  helper: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  grow: { flex: 1 },
  savedText: { color: colors.mint, fontSize: 13, marginTop: spacing.md, textAlign: 'center' },
  weekList: { marginTop: spacing.md, gap: spacing.xs },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { color: colors.textMuted, fontSize: 13 },
  weekCount: { color: colors.text, fontSize: 13, fontWeight: '600' },
});
