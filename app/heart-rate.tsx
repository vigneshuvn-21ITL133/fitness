import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { latestHeartRate, sortedHeartRate } from '@/domain/healthState';
import { formatDateTime } from '@/lib/date';
import { validateHeartRate } from '@/domain/validation';
import { useHealth } from '@/store/health-store';
import { useThemedStyles } from '@/store/theme-store';
import { colors, spacing, type Palette } from '@/theme';

export default function HeartRateScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { state, addHrEntry, removeHrEntry } = useHealth();
  const [bpmInput, setBpmInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const latest = latestHeartRate(state.heartRate);
  const history = sortedHeartRate(state.heartRate).reverse();

  const save = () => {
    const result = validateHeartRate(bpmInput);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addHrEntry(result.value);
    setBpmInput('');
    setError(null);
  };

  const confirmRemove = (id: string) => {
    Alert.alert('Delete this reading?', 'It is removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeHrEntry(id) },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Heart rate" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Card>
          <View style={styles.noticeRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.mint} />
            <Text style={styles.notice}>
              Readings here are entered by hand. A phone cannot measure heart rate reliably on its own, and no
              wearable or heart-rate sensor is connected yet. Each reading is labelled as manual. This is not a
              diagnosis. Speak to a clinician about any concerns.
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
                {formatDateTime(latest.timestamp)} · Manual entry
              </Text>
            </>
          ) : (
            <EmptyState title="No readings yet" body="Add a reading below to see it here." />
          )}
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
          <Text style={styles.hint}>The reading is saved with the current time.</Text>
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
                  {formatDateTime(entry.timestamp)} · Manual
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
    bigValue: { color: colors.text, fontSize: 36, fontWeight: '700' },
    unit: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
    meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    hint: { color: colors.textFaint, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },
    section: { color: colors.text, fontSize: 16, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  });
