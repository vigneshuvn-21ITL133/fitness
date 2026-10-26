import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MoodProvider, useMoods } from '@/store/mood-store';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MoodProvider>
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
          </Stack>
        </AppGate>
      </MoodProvider>
    </SafeAreaProvider>
  );
}

/** Hold rendering until stored moods are loaded, so the home screen never flashes empty. */
function AppGate({ children }: { children: React.ReactNode }) {
  const { ready } = useMoods();
  if (!ready) {
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
