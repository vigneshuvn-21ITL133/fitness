import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { MoodFace } from '@/components/MoodFace';
import { canRecordMood } from '@/domain/mood';
import { addDays, relativeDayLabel, startOfDay, toDateKey } from '@/lib/date';
import { useMoods } from '@/store/mood-store';
import { colors, radius, spacing } from '@/theme';
import { MOOD_KEYS, MOOD_LABEL, type MoodKey } from '@/types';

const HISTORY_DAYS = 14;

export default function JournalScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { getMood, setMood, clearMood } = useMoods();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(today, -i));
  }, []);

  const logged = days.filter((d) => getMood(d) !== undefined).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.subtitle}>
        {logged} of {HISTORY_DAYS} days logged. Moods are recorded by hand from today onwards; past days can't be changed.
      </Text>

      <View style={styles.list}>
        {days.map((day) => {
          const key = toDateKey(day);
          const mood = getMood(day);
          const open = openKey === key;
          return (
            <Card key={key} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${relativeDayLabel(day)} mood`}
                disabled={!canRecordMood(day)}
                onPress={() => setOpenKey(open ? null : key)}
                style={styles.rowHeader}
              >
                <MoodFace mood={mood} size={34} />
                <View style={styles.rowText}>
                  <Text style={styles.rowDay}>{relativeDayLabel(day)}</Text>
                  <Text style={styles.rowMood}>{mood ? MOOD_LABEL[mood] : 'Not logged'}</Text>
                </View>
              </Pressable>

              {open ? (
                <View style={styles.picker}>
                  {MOOD_KEYS.map((option: MoodKey) => {
                    const active = option === mood;
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityLabel={MOOD_LABEL[option]}
                        onPress={() => {
                          setMood(day, option);
                          setOpenKey(null);
                        }}
                        style={[styles.option, active && styles.optionActive]}
                      >
                        <MoodFace mood={option} size={30} />
                        <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                          {MOOD_LABEL[option]}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {mood ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        clearMood(day);
                        setOpenKey(null);
                      }}
                      style={styles.clear}
                    >
                      <Text style={styles.clearText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    padding: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowDay: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMood: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  option: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  optionActive: {
    backgroundColor: colors.yellow,
  },
  optionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  optionLabelActive: {
    color: colors.onAccent,
    fontWeight: '700',
  },
  clear: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  clearText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '500',
  },
});
