import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { RingChart } from '@/components/RingChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { averageBp, BP_CATEGORY_LABEL, categorizeBp } from '@/domain/bloodPressure';
import { getBmiResult } from '@/domain/bmi';
import { latestBloodPressure, latestWeight, weightChange } from '@/domain/healthState';
import { effectiveSteps, goalProgress } from '@/domain/steps';
import { formatChange, formatWeight } from '@/domain/units';
import { toDateKey } from '@/lib/date';
import { useHealth } from '@/store/health-store';
import { colors, spacing } from '@/theme';

export default function FitnessDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useHealth();
  const units = state.profile?.units ?? 'metric';

  const todayKey = toDateKey(new Date());
  const steps = effectiveSteps(state.steps[todayKey]);
  const progress = goalProgress(steps, state.stepGoal);

  const latestW = latestWeight(state.weights);
  const change = weightChange(state.weights);
  const latestBp = latestBloodPressure(state.bloodPressure);
  const recentBpAvg = useMemo(
    () => averageBp(state.bloodPressure.slice(-7)),
    [state.bloodPressure],
  );

  const bmi =
    state.profile && latestW ? getBmiResult(latestW.kg, state.profile.heightCm, state.profile.age) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Fitness" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {!state.profile ? (
          <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button">
            <Card style={styles.prompt}>
              <Ionicons name="person-circle-outline" size={22} color={colors.yellow} />
              <Text style={styles.promptText}>Set up your profile to see BMI and personal estimates.</Text>
            </Card>
          </Pressable>
        ) : null}

        <Pressable onPress={() => router.navigate('/steps')} accessibilityRole="button">
          <Card style={styles.stepsCard}>
            <RingChart size={110} strokeWidth={12} rings={[{ progress, color: colors.mint }]}>
              <View style={styles.ringCenter}>
                <Text style={styles.ringValue}>{Math.round(progress * 100)}%</Text>
              </View>
            </RingChart>
            <View style={styles.stepsText}>
              <Text style={styles.cardLabel}>Steps today</Text>
              <Text style={styles.bigValue}>{steps.toLocaleString('en-US')}</Text>
              <Text style={styles.meta}>Goal {state.stepGoal.toLocaleString('en-US')}</Text>
            </View>
          </Card>
        </Pressable>

        <View style={styles.pair}>
          <Pressable style={styles.half} onPress={() => router.navigate('/weight')} accessibilityRole="button">
            <Card style={styles.halfCard}>
              <Text style={styles.cardLabel}>Weight</Text>
              <Text style={styles.midValue}>
                {latestW ? formatWeight(latestW.kg, units) : '—'}
              </Text>
              <Text style={styles.meta}>
                {change !== null ? formatChange(change, units) : 'Add two entries for a change'}
              </Text>
            </Card>
          </Pressable>
          <Pressable style={styles.half} onPress={() => router.navigate('/blood-pressure')} accessibilityRole="button">
            <Card style={styles.halfCard}>
              <Text style={styles.cardLabel}>Blood pressure</Text>
              <Text style={styles.midValue}>
                {latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '—'}
              </Text>
              <Text style={styles.meta}>
                {latestBp
                  ? BP_CATEGORY_LABEL[categorizeBp(latestBp.systolic, latestBp.diastolic)]
                  : 'No readings yet'}
              </Text>
            </Card>
          </Pressable>
        </View>

        <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button">
          <Card>
            <Text style={styles.cardLabel}>BMI</Text>
            {bmi ? (
              <>
                <Text style={styles.midValue}>{bmi.bmi.toFixed(1)}</Text>
                <Text style={styles.meta}>
                  {bmi.kind === 'adult' ? bmi.label : 'Under 18: see guidance on Profile'}
                </Text>
                {bmi.kind === 'adult' ? (
                  <View style={{ marginTop: spacing.md }}>
                    <ProgressBar
                      label="Position on scale (15–40)"
                      valueLabel={bmi.bmi.toFixed(1)}
                      progress={(Math.min(Math.max(bmi.bmi, 15), 40) - 15) / 25}
                      color={colors.mint}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.meta}>Needs your profile and a weight entry.</Text>
            )}
          </Card>
        </Pressable>

        {recentBpAvg ? (
          <Card>
            <Text style={styles.cardLabel}>Average of last readings</Text>
            <Text style={styles.midValue}>
              {recentBpAvg.systolic}/{recentBpAvg.diastolic} mmHg
            </Text>
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actions}>
          <Action label="Log steps" icon="footsteps-outline" onPress={() => router.navigate('/steps')} />
          <Action label="Log weight" icon="scale-outline" onPress={() => router.navigate('/weight')} />
          <Action label="Log BP" icon="heart-outline" onPress={() => router.navigate('/blood-pressure')} />
          <Action label="Profile" icon="person-outline" onPress={() => router.navigate('/profile')} />
          <Action label="Health tips" icon="book-outline" onPress={() => router.navigate('/benefits')} />
        </View>
      </ScrollView>
    </View>
  );
}

function Action({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  promptText: { color: colors.text, fontSize: 13, flex: 1 },
  stepsCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  stepsText: { flex: 1 },
  cardLabel: { color: colors.textMuted, fontSize: 13 },
  bigValue: { color: colors.text, fontSize: 26, fontWeight: '700', marginTop: 2 },
  midValue: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 4 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  pair: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  halfCard: { flex: 1, minHeight: 130 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  action: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  actionLabel: { color: colors.text, fontSize: 12, fontWeight: '500' },
});
