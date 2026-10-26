import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { USER } from '@/data/mock';
import { useHealth } from '@/store/health-store';
import { useMoods } from '@/store/mood-store';
import { THEME_MODES, useThemeMode, type ThemeMode } from '@/store/theme-store';
import { colors, radius, spacing } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { resetAll } = useMoods();
  const { mode, setMode } = useThemeMode();
  const { state: health } = useHealth();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const confirmReset = () => {
    Alert.alert(
      'Clear all mood data?',
      'This removes every logged mood on this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: resetAll },
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
      <Card style={styles.group}>
        <Text style={styles.themeHint}>Choose light, dark, or follow the device setting.</Text>
        <SegmentedControl<ThemeMode>
          options={THEME_MODES}
          value={mode}
          onChange={(next: ThemeMode) => setMode(next)}
        />
      </Card>

      <Text style={styles.section}>Profile</Text>
      <Card style={styles.group}>
        <View style={styles.profileRow}>
          {health.profile?.avatarUri ? (
            <Image source={{ uri: health.profile.avatarUri }} style={styles.avatarImage} accessibilityLabel="Profile photo" />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{USER.initials}</Text>
            </View>
          )}
          <View>
            <Text style={styles.profileName}>{USER.name}</Text>
            <Text style={styles.profileSub}>Personal health profile</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.section}>Data</Text>
      <Card style={styles.group}>
        <Row icon="trash-outline" label="Clear all mood data" danger onPress={confirmReset} />
      </Card>

      <Text style={styles.section}>About</Text>
      <Card style={styles.group}>
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
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  themeHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
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
  group: {
    padding: 0,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 18,
  },
  profileName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  profileSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
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
