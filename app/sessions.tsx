import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { sessionSteps } from '@/domain/activity';
import { formatDuration, formatKm, formatSessionDate } from '@/domain/format';
import { sessionsNewestFirst } from '@/domain/activityState';
import { useActivity } from '@/store/activity-store';
import { colors, spacing } from '@/theme';
import type { SessionStatus } from '@/types';

const STATUS_LABEL: Record<SessionStatus, string> = {
  active: 'In progress',
  paused: 'Paused',
  completed: 'Completed',
  interrupted: 'Interrupted (saved to last update)',
};

export default function SessionsScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { state } = useActivity();
  const sessions = sessionsNewestFirst(state);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Past walks" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {sessions.length === 0 ? (
          <EmptyState title="No walks yet" body="Start a walk on the Tracking screen to see it here." />
        ) : (
          sessions.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`Walk on ${formatSessionDate(s.startedAt)}`}
              onPress={() => router.push(`/session?id=${encodeURIComponent(s.id)}`)}
            >
              <Card>
                <View style={styles.headerRow}>
                  <Text style={styles.date}>{formatSessionDate(s.startedAt)}</Text>
                  <Text style={styles.status}>{STATUS_LABEL[s.status]}</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.stat}>{formatDuration(s.activeMs)}</Text>
                  <Text style={styles.stat}>{formatKm(s.distanceM)}</Text>
                  <Text style={styles.stat}>{sessionSteps(s).toLocaleString('en-US')} steps</Text>
                </View>
                {s.gps ? <Text style={styles.gps}>GPS route recorded</Text> : null}
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: colors.text, fontSize: 15, fontWeight: '600' },
  status: { color: colors.textMuted, fontSize: 11 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  stat: { color: colors.text, fontSize: 13 },
  gps: { color: colors.mint, fontSize: 11, marginTop: spacing.sm },
});
