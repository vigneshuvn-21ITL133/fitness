import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActivityProvider, useActivity } from '@/store/activity-store';
import { HealthProvider, useHealth } from '@/store/health-store';
import { MoodProvider, useMoods } from '@/store/mood-store';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MoodProvider>
        <HealthProvider>
          <ActivityProvider>
            <StatusBar style="light" />
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
                <Stack.Screen name="weight" />
                <Stack.Screen name="blood-pressure" />
                <Stack.Screen name="profile" />
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
  const { ready: moodsReady } = useMoods();
  const { ready: healthReady } = useHealth();
  const { ready: activityReady } = useActivity();
  if (!moodsReady || !healthReady || !activityReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.mint} />
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
