import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ProfileDetails } from '@/components/ProfileDetails';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useActivity } from '@/store/activity-store';
import { useHealth } from '@/store/health-store';
import { useMoods } from '@/store/mood-store';
import { THEME_MODES, useThemedStyles, useThemeMode, type ThemeMode } from '@/store/theme-store';
import { colors, spacing, type Palette } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { resetAll } = useMoods();
  const { resetHealth } = useHealth();
  const { clearAll: clearActivity } = useActivity();
  const { mode, setMode } = useThemeMode();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const confirmResetMoods = () => {
    Alert.alert(
      'Clear all mood data?',
      'This removes every logged mood on this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: resetAll },
      ],
    );
  };

  const confirmResetPersonal = () => {
    Alert.alert(
      'Clear all personal data?',
      'This deletes your profile, weight and blood pressure entries, steps, goals, and every walk on this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear data',
          style: 'destructive',
          onPress: () => {
            resetHealth();
            clearActivity();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>Appearance</Text>
      <Card style={styles.appearanceCard}>
        <Text style={styles.themeHint}>Choose light, dark, or follow the device setting.</Text>
        <SegmentedControl<ThemeMode>
          options={THEME_MODES}
          value={mode}
          onChange={(next: ThemeMode) => setMode(next)}
        />
      </Card>

      <Text style={styles.section}>Profile</Text>
      <View style={styles.group}>
        <ProfileDetails />
      </View>

      <Text style={styles.section}>Data</Text>
      <Card style={styles.rowGroup}>
        <Row icon="trash-outline" label="Clear all mood data" danger onPress={confirmResetMoods} />
        <Row icon="person-remove-outline" label="Clear all personal data" danger onPress={confirmResetPersonal} />
      </Card>

      <Text style={styles.section}>About</Text>
      <Card style={styles.rowGroup}>
        <Row icon="information-circle-outline" label="Version" value={version} />
      </Card>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  danger,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={danger ? colors.red : colors.textMuted} />
      <Text style={[styles.rowLabel, danger && { color: colors.red }]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress && !danger ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {content}
    </Pressable>
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
    marginBottom: spacing.xl,
  },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  appearanceCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  themeHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  group: {
    marginBottom: spacing.xl,
  },
  rowGroup: {
    padding: 0,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
