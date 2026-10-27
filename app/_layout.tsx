import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActivityProvider, useActivity } from '@/store/activity-store';
import { HealthProvider, useHealth } from '@/store/health-store';
import { MoodProvider, useMoods } from '@/store/mood-store';
import { ThemeProvider, useThemeMode } from '@/store/theme-store';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { resolved } = useThemeMode();
  return (
    <SafeAreaProvider>
      <MoodProvider>
        <HealthProvider>
          <ActivityProvider>
            <StatusBar style={resolved === 'light' ? 'dark' : 'light'} />
            <AppGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="sleep" />
                <Stack.Screen name="fitness" />
                <Stack.Screen name="steps" />
                <Stack.Screen name="tracking" />
                <Stack.Screen name="sessions" />
                <Stack.Screen name="session" />
                <Stack.Screen name="heart-rate" />
                <Stack.Screen name="weight" />
                <Stack.Screen name="blood-pressure" />
                <Stack.Screen name="benefits" />
              </Stack>
            </AppGate>
          </ActivityProvider>
        </HealthProvider>
      </MoodProvider>
    </SafeAreaProvider>
  );
}

/** Hold rendering until stored data is loaded, so screens never flash empty. */
function AppGate({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const { ready: moodsReady } = useMoods();
  const { ready: healthReady } = useHealth();
  const { ready: activityReady } = useActivity();
  const { ready: themeReady } = useThemeMode();
  if (!moodsReady || !healthReady || !activityReady || !themeReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.mint} />
      </View>
    );
  }
  return <>{children}</>;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
