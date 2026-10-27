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
import { latestWeight, sortedWeights, weightChange } from '@/domain/healthState';
import { formatChange, formatWeight, kgPerInputUnit, kgToDisplay, weightUnitLabel } from '@/domain/units';
import { validateWeightKg } from '@/domain/validation';
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

export default function WeightScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { state, addWeightEntry, editWeightEntry, removeWeightEntry } = useHealth();
  const units = state.profile?.units ?? 'metric';
  const unit = weightUnitLabel(units);

  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => sortedWeights(state.weights), [state.weights]);
  const latest = latestWeight(state.weights);
  const change = weightChange(state.weights);

  const chartValues = sorted.map((w) => Number(kgToDisplay(w.kg, units).toFixed(1)));

  const startEdit = (id: string, kg: number) => {
    setEditingId(id);
    setInput(kgToDisplay(kg, units).toFixed(1));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setInput('');
    setError(null);
  };

  const save = () => {
    const result = validateWeightKg(input, kgPerInputUnit(units));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (editingId) {
      editWeightEntry(editingId, result.value);
    } else {
      addWeightEntry(result.value);
    }
    cancelEdit();
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete this weight?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeWeightEntry(id);
          if (editingId === id) cancelEdit();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Weight" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>Latest</Text>
          <Text style={styles.summaryValue}>
            {latest ? formatWeight(latest.kg, units) : 'No entries yet'}
          </Text>
          {latest ? <Text style={styles.source}>Source: {SOURCE_LABEL[latest.source]}</Text> : null}
          {change !== null ? (
            <Text style={[styles.change, { color: change > 0 ? colors.orange : colors.mint }]}>
              {formatChange(change, units)} since last entry
            </Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{editingId ? 'Edit weight' : 'Add weight'}</Text>
          <FormField
            label={`Weight (${unit})`}
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setError(null);
            }}
            placeholder={unit === 'kg' ? 'e.g. 72.5' : 'e.g. 160'}
            suffix={unit}
            error={error}
          />
          <View style={styles.actions}>
            <Button label={editingId ? 'Save changes' : 'Add entry'} onPress={save} style={styles.grow} />
            {editingId ? (
              <Button label="Cancel" variant="secondary" onPress={cancelEdit} style={styles.grow} />
            ) : null}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Trend</Text>
          {sorted.length === 0 ? (
            <EmptyState title="No weight history" body="Add your first entry to see the trend." />
          ) : (
            <View style={{ marginTop: spacing.md }}>
              <LineChart
                series={[{ color: colors.lilac, values: chartValues }]}
                labels={sorted.map((w) => formatDayMonth(new Date(w.timestamp)))}
                unit={` ${unit}`}
              />
            </View>
          )}
        </Card>

        <Text style={styles.sectionTitle}>History</Text>
        {sorted.length === 0 ? (
          <EmptyState title="Nothing logged yet" />
        ) : (
          [...sorted].reverse().map((entry) => (
            <Card key={entry.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowValue}>{formatWeight(entry.kg, units)}</Text>
                <Text style={styles.rowDate}>
                  {formatDateTime(entry.timestamp)} · {SOURCE_LABEL[entry.source]}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Button label="Edit" variant="secondary" onPress={() => startEdit(entry.id, entry.kg)} />
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
  summaryValue: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 4 },
  source: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  change: { fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  card: {},
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  grow: { flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rowText: { flex: 1 },
  rowValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowDate: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: spacing.sm },
});
