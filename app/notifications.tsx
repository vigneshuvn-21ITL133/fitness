import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { remindersFor } from '@/domain/notifications';
import { useHealth } from '@/store/health-store';
import { useMoods } from '@/store/mood-store';
import { useThemedStyles } from '@/store/theme-store';
import { colors, spacing, type Palette } from '@/theme';

export default function NotificationsScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { state } = useHealth();
  const { moods } = useMoods();
  const reminders = useMemo(() => remindersFor(state, moods, new Date()), [state, moods]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.note}>
          Reminders come from your own records and are shown here inside the app.
        </Text>
        {reminders.length === 0 ? (
          <Card>
            <EmptyState title="You are all caught up" body="No reminders for now." />
          </Card>
        ) : (
          reminders.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole={item.route ? 'button' : 'text'}
              disabled={!item.route}
              onPress={() => item.route && router.push(item.route)}
            >
              <Card style={styles.row}>
                <Ionicons name="notifications-outline" size={20} color={colors.mint} />
                <View style={styles.rowText}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.body}>{item.body}</Text>
                </View>
                {item.route ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.md },
    note: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowText: { flex: 1 },
    title: { color: colors.text, fontSize: 15, fontWeight: '600' },
    body: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  });
