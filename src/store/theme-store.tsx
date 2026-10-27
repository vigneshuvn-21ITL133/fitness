import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { applyPalette, colors, type Palette, type ResolvedTheme } from '@/theme';

const STORAGE_KEY = 'pulse.theme.v1';

export type ThemeMode = 'system' | 'light' | 'dark';
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

interface ThemeContextValue {
  ready: boolean;
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && isThemeMode(raw)) setModeState(raw);
      } catch {
        // Fall back to the system theme; the choice is simply not restored.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved: ResolvedTheme =
    mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;

  // Write the palette before children render so every screen reads the new colours.
  applyPalette(resolved);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ready,
      mode,
      resolved,
      setMode: (next) => {
        setModeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
          // Not persisted; the choice still applies for this session.
        });
      },
    }),
    [ready, mode, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside <ThemeProvider>');
  return ctx;
}

/** Subscribes a component to theme changes so it re-renders with new colours. */
export function useThemeVersion(): ResolvedTheme {
  return useThemeMode().resolved;
}

/**
 * Builds styles from the current palette and rebuilds them when the theme changes.
 * Pass a module-level factory so the reference stays stable.
 */
export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const resolved = useThemeVersion();
  return useMemo(() => factory(colors), [factory, resolved]);
}
