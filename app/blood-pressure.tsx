import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/FormField';
import { LineChart } from '@/components/LineChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { averageBp, BP_CATEGORY_LABEL, BP_NOTE, categorizeBp } from '@/domain/bloodPressure';
import { latestBloodPressure, sortedBloodPressure } from '@/domain/healthState';
import { validateBloodPressure } from '@/domain/validation';
import { formatDateTime, formatDayMonth } from '@/lib/date';
import { useHealth } from '@/store/health-store';
import { colors, spacing } from '@/theme';
import type { ReadingSource } from '@/types';

const SOURCE_LABEL: Record<ReadingSource, string> = {
  manual: 'Manual',
  healthkit: 'HealthKit',
  'health-connect': 'Health Connect',
  derived: 'Derived',
};

export default function BloodPressureScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { state, addBpEntry, editBpEntry, removeBpEntry } = useHealth();

  const [systolicInput, setSystolicInput] = useState('');
  const [diastolicInput, setDiastolicInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => sortedBloodPressure(state.bloodPressure), [state.bloodPressure]);
  const latest = latestBloodPressure(state.bloodPressure);
  const recentAverage = averageBp(sorted.slice(-7));

  const cancelEdit = () => {
    setEditingId(null);
    setSystolicInput('');
    setDiastolicInput('');
    setError(null);
  };

  const startEdit = (id: string, systolic: number, diastolic: number) => {
    setEditingId(id);
    setSystolicInput(String(systolic));
    setDiastolicInput(String(diastolic));
    setError(null);
  };

  const save = () => {
    const result = validateBloodPressure(systolicInput, diastolicInput);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (editingId) {
      editBpEntry(editingId, result.value.systolic, result.value.diastolic);
    } else {
      addBpEntry(result.value.systolic, result.value.diastolic);
    }
    cancelEdit();
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete this reading?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeBpEntry(id);
          if (editingId === id) cancelEdit();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Blood Pressure" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>Latest reading</Text>
          <Text style={styles.summaryValue}>
            {latest ? `${latest.systolic}/${latest.diastolic} mmHg` : 'No readings yet'}
          </Text>
          {latest ? <Text style={styles.source}>Source: {SOURCE_LABEL[latest.source]}</Text> : null}
          {latest ? (
            <Text style={styles.category}>
              {BP_CATEGORY_LABEL[categorizeBp(latest.systolic, latest.diastolic)]}
            </Text>
          ) : null}
          {recentAverage ? (
            <Text style={styles.average}>
              Average of last {Math.min(sorted.length, 7)}: {recentAverage.systolic}/{recentAverage.diastolic} mmHg
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>{editingId ? 'Edit reading' : 'Add reading'}</Text>
          <FormField
            label="Systolic (top number)"
            value={systolicInput}
            onChangeText={(t) => {
              setSystolicInput(t);
              setError(null);
            }}
            placeholder="e.g. 120"
            suffix="mmHg"
            keyboardType="number-pad"
          />
          <FormField
            label="Diastolic (bottom number)"
            value={diastolicInput}
            onChangeText={(t) => {
              setDiastolicInput(t);
              setError(null);
            }}
            placeholder="e.g. 80"
            suffix="mmHg"
            error={error}
            keyboardType="number-pad"
          />
          <View style={styles.actions}>
            <Button label={editingId ? 'Save changes' : 'Add reading'} onPress={save} style={styles.grow} />
            {editingId ? (
              <Button label="Cancel" variant="secondary" onPress={cancelEdit} style={styles.grow} />
            ) : null}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Trend</Text>
          {sorted.length === 0 ? (
            <EmptyState title="No readings yet" body="Add a reading to see your trend." />
          ) : (
            <View style={{ marginTop: spacing.md }}>
              <LineChart
                series={[
                  { color: colors.lilac, values: sorted.map((b) => b.systolic), label: 'Systolic' },
                  { color: colors.mint, values: sorted.map((b) => b.diastolic), label: 'Diastolic' },
                ]}
                labels={sorted.map((b) => formatDayMonth(new Date(b.timestamp)))}
                unit=""
              />
            </View>
          )}
        </Card>

        <Text style={styles.note}>{BP_NOTE}</Text>

        <Text style={styles.sectionTitle}>History</Text>
        {sorted.length === 0 ? (
          <EmptyState title="Nothing logged yet" />
        ) : (
          [...sorted].reverse().map((entry) => (
            <Card key={entry.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowValue}>
                  {entry.systolic}/{entry.diastolic} mmHg
                </Text>
                <Text style={styles.rowMeta}>
                  {BP_CATEGORY_LABEL[categorizeBp(entry.systolic, entry.diastolic)]} · {formatDateTime(entry.timestamp)} ·{' '}
                  {SOURCE_LABEL[entry.source]}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Button
                  label="Edit"
                  variant="secondary"
                  onPress={() => startEdit(entry.id, entry.systolic, entry.diastolic)}
                />
                <Button label="Delete" variant="danger" onPress={() => confirmDelete(entry.id)} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  summary: { alignItems: 'center' },
  summaryLabel: { color: colors.textMuted, fontSize: 13 },
  summaryValue: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 4 },
  source: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  category: { color: colors.yellow, fontSize: 14, fontWeight: '600', marginTop: spacing.xs },
  average: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  grow: { flex: 1 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rowText: { flex: 1 },
  rowValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: spacing.sm },
});
