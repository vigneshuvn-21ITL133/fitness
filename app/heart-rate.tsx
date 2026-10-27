import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { latestHeartRate, sortedHeartRate } from '@/domain/healthState';
import { TAP_WINDOW_SECONDS, tapsToBpm, validateTapCount } from '@/domain/heartTap';
import { formatDateTime } from '@/lib/date';
import { validateHeartRate } from '@/domain/validation';
import { useHealth } from '@/store/health-store';
import { useThemedStyles } from '@/store/theme-store';
import type { HeartRateSource } from '@/types';
import { colors, spacing, type Palette } from '@/theme';

type TapPhase = 'idle' | 'counting' | 'done';

const SOURCE_LABEL: Record<HeartRateSource, string> = {
  manual: 'Manual entry',
  tap: 'Tap count',
};

export default function HeartRateScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { state, addHrEntry, removeHrEntry } = useHealth();
  const [bpmInput, setBpmInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<TapPhase>('idle');
  const [taps, setTaps] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TAP_WINDOW_SECONDS);
  const [tapError, setTapError] = useState<string | null>(null);
  const startedAt = useRef(0);

  // Counts down from the moment the user starts. Time is read from the clock,
  // not counted by ticks, so the window stays 15 seconds even if a tick is late.
  useEffect(() => {
    if (phase !== 'counting') return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      if (elapsed >= TAP_WINDOW_SECONDS) {
        setSecondsLeft(0);
        setPhase('done');
        return;
      }
      setSecondsLeft(Math.ceil(TAP_WINDOW_SECONDS - elapsed));
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  const latest = latestHeartRate(state.heartRate);
  const history = sortedHeartRate(state.heartRate).reverse();

  const save = () => {
    const result = validateHeartRate(bpmInput);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addHrEntry(result.value, undefined, 'manual');
    setBpmInput('');
    setError(null);
  };

  const startTapCount = () => {
    setTaps(0);
    setSecondsLeft(TAP_WINDOW_SECONDS);
    setTapError(null);
    startedAt.current = Date.now();
    setPhase('counting');
  };

  const tap = () => {
    if (phase !== 'counting') return;
    setTaps((t) => t + 1);
  };

  const saveTapCount = () => {
    const result = validateTapCount(taps);
    if (!result.ok) {
      setTapError(result.error);
      return;
    }
    addHrEntry(result.value, undefined, 'tap');
    setPhase('idle');
    setTaps(0);
    setTapError(null);
  };

  const confirmRemove = (id: string) => {
    Alert.alert('Delete this reading?', 'It is removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeHrEntry(id) },
    ]);
  };

  const tapBpm = tapsToBpm(taps);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Heart rate" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Card>
          <View style={styles.noticeRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.mint} />
            <Text style={styles.notice}>
              No heart-rate sensor is connected, and a phone cannot measure heart rate reliably on its own. Readings
              are either typed in by hand or counted by tapping along to your pulse. Each reading is labelled with
              how it was obtained. This is not a diagnosis. Speak to a clinician about any concerns.
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Latest reading</Text>
          {latest ? (
            <>
              <Text style={styles.bigValue}>
                {latest.bpm}
                <Text style={styles.unit}> bpm</Text>
              </Text>
              <Text style={styles.meta}>
                {formatDateTime(latest.timestamp)} · {SOURCE_LABEL[latest.source]}
              </Text>
            </>
          ) : (
            <EmptyState title="No readings yet" body="Add a reading below to see it here." />
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Count by tapping</Text>
          {phase === 'idle' ? (
            <>
              <Text style={styles.body}>
                Press the fingerprint button, then tap once for each beat you feel for {TAP_WINDOW_SECONDS} seconds.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Press to measure heart rate for ${TAP_WINDOW_SECONDS} seconds`}
                onPress={startTapCount}
                style={({ pressed }) => [styles.tapButton, pressed && styles.tapButtonPressed]}
              >
                <Ionicons name="finger-print" size={56} color={colors.mint} />
                <Text style={styles.tapLabel}>Press to measure for {TAP_WINDOW_SECONDS} s</Text>
              </Pressable>
            </>
          ) : null}

          {phase === 'counting' ? (
            <>
              <Text style={styles.bigValue}>
                {secondsLeft}
                <Text style={styles.unit}> s left</Text>
              </Text>
              <Text style={styles.meta}>{taps} taps so far</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tap once for each beat"
                onPress={tap}
                style={({ pressed }) => [styles.tapButton, pressed && styles.tapButtonPressed]}
              >
                <Ionicons name="pulse-outline" size={36} color={colors.mint} />
                <Text style={styles.tapLabel}>Tap for each beat</Text>
              </Pressable>
            </>
          ) : null}

          {phase === 'done' ? (
            <>
              <Text style={styles.bigValue}>
                {tapBpm}
                <Text style={styles.unit}> bpm</Text>
              </Text>
              <Text style={styles.meta}>
                {taps} taps in {TAP_WINDOW_SECONDS} seconds × {60 / TAP_WINDOW_SECONDS} = {tapBpm} bpm
              </Text>
              <Text style={styles.warning}>
                This is a count of your taps, not a sensor reading. It can be off if you missed beats or tapped
                extra times.
              </Text>
              {tapError ? <Text style={styles.error}>{tapError}</Text> : null}
              <Button label="Save tap count" onPress={saveTapCount} />
              <View style={{ height: spacing.sm }} />
              <Button label="Count again" variant="secondary" onPress={startTapCount} />
            </>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Add a reading</Text>
          <FormField
            label="Heart rate (beats per minute)"
            value={bpmInput}
            onChangeText={(t) => {
              setBpmInput(t);
              setError(null);
            }}
            placeholder="e.g. 72"
            suffix="bpm"
            error={error}
            keyboardType="number-pad"
          />
          <Button label="Save reading" onPress={save} />
          <Text style={styles.hint}>The reading is saved with the current time and labelled as a manual entry.</Text>
        </Card>

        <Text style={styles.section}>History</Text>
        {history.length === 0 ? (
          <Card>
            <Text style={styles.meta}>Saved readings appear here, newest first.</Text>
          </Card>
        ) : (
          history.map((entry) => (
            <Card key={entry.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowValue}>{entry.bpm} bpm</Text>
                <Text style={styles.meta}>
                  {formatDateTime(entry.timestamp)} · {SOURCE_LABEL[entry.source]}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete reading of ${entry.bpm} bpm`}
                onPress={() => confirmRemove(entry.id)}
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={18} color={colors.red} />
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
    noticeRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    notice: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
    body: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
    bigValue: { color: colors.text, fontSize: 36, fontWeight: '700' },
    unit: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
    meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    warning: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.md },
    error: { color: colors.red, fontSize: 12, marginTop: spacing.sm },
    hint: { color: colors.textFaint, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
    section: { color: colors.text, fontSize: 16, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
    tapButton: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      paddingVertical: spacing.xl,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.mint,
      backgroundColor: colors.card,
    },
    tapButtonPressed: { opacity: 0.7 },
    tapLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  });
