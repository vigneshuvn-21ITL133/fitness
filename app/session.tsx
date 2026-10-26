import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { RouteMap } from '@/components/RouteMap';
import { ScreenHeader } from '@/components/ScreenHeader';
import { estimateSessionKcal, paceMinPerKm, sessionSteps, DEFAULT_WEIGHT_KG } from '@/domain/activity';
import { findSession } from '@/domain/activityState';
import { latestWeight } from '@/domain/healthState';
import { formatClock, formatDuration, formatKm, formatPace, formatSessionDate } from '@/domain/format';
import { validateSteps } from '@/domain/validation';
import { useActivity } from '@/store/activity-store';
import { useHealth } from '@/store/health-store';
import { colors, spacing } from '@/theme';

export default function SessionDetailScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, setManualSteps, remove } = useActivity();
  const { state: health } = useHealth();
  const session = findSession(state, String(id ?? ''));

  const [stepsInput, setStepsInput] = useState('');
  const [stepsError, setStepsError] = useState<string | null>(null);

  if (!session) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Walk" />
        <View style={{ paddingHorizontal: spacing.xl }}>
          <EmptyState title="Walk not found" body="It may have been deleted." />
        </View>
      </View>
    );
  }

  const currentWeight = latestWeight(health.weights)?.kg ?? DEFAULT_WEIGHT_KG;
  const recalculated = estimateSessionKcal(currentWeight, session.activeMs, session.distanceM);
  const pace = paceMinPerKm(session.distanceM, session.activeMs);
  const steps = sessionSteps(session);

  const saveSteps = () => {
    const result = validateSteps(stepsInput);
    if (!result.ok) {
      setStepsError(result.error);
      return;
    }
    setManualSteps(session.id, result.value);
    setStepsInput('');
    setStepsError(null);
  };

  const confirmDelete = () => {
    Alert.alert('Delete this walk?', 'Its time, distance, steps and route will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove(session.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Walk" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Card>
          <Text style={styles.date}>{formatSessionDate(session.startedAt)}</Text>
          <Text style={styles.meta}>
            {session.endedAt ? `Ended ${formatClock(session.endedAt)}` : 'Still running'} ·{' '}
            {session.gps ? 'GPS route' : 'steps and time only'}
          </Text>
          <View style={styles.statsRow}>
            <Stat value={formatDuration(session.activeMs)} label="Active time" />
            <Stat value={formatKm(session.distanceM)} label="Distance" />
            <Stat value={formatPace(pace)} label="Pace" />
          </View>
          <View style={styles.statsRow}>
            <Stat value={steps.toLocaleString('en-US')} label="Steps" />
            <Stat
              value={session.kcal !== null ? `${session.kcal} kcal` : `${recalculated} kcal`}
              label={session.kcal !== null ? 'Estimated at finish' : 'Estimated so far'}
            />
          </View>
        </Card>

        {session.kcal !== null ? (
          <Card>
            <Text style={styles.cardTitle}>Calorie estimate</Text>
            <Text style={styles.explain}>
              Saved at finish using {session.kcalWeightKg?.toFixed(1)} kg. Stays the same when your weight changes.
            </Text>
            {session.kcalWeightKg !== null && Math.abs(session.kcalWeightKg - currentWeight) >= 0.05 ? (
              <Text style={styles.explain}>
                With your current weight ({currentWeight.toFixed(1)} kg) it would be about {recalculated} kcal.
              </Text>
            ) : null}
          </Card>
        ) : null}

        {session.gps ? (
          <View>
            <RouteMap points={session.route.map((p) => ({ lat: p.lat, lng: p.lng }))} height={260} />
            <Text style={styles.explain}>
              {session.route.length} location points kept after filtering out weak or jumping GPS readings.
            </Text>
          </View>
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Steps for this walk</Text>
          <Text style={styles.explain}>
            {session.manualSteps !== null
              ? 'You entered this count by hand.'
              : 'Counted by the device step sensor during the walk.'}
          </Text>
          <FormField
            label="Set steps by hand"
            value={stepsInput}
            onChangeText={(t) => {
              setStepsInput(t);
              setStepsError(null);
            }}
            placeholder="e.g. 4200"
            suffix="steps"
            error={stepsError}
            keyboardType="number-pad"
          />
          <View style={styles.actions}>
            <Button label="Save steps" onPress={saveSteps} style={styles.grow} />
            {session.manualSteps !== null ? (
              <Button
                label="Use sensor"
                variant="secondary"
                onPress={() => setManualSteps(session.id, null)}
                style={styles.grow}
              />
            ) : null}
          </View>
        </Card>

        <Button label="Delete this walk" variant="danger" onPress={confirmDelete} />
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  date: { color: colors.text, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  explain: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
  grow: { flex: 1 },
});
