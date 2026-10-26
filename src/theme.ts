/**
 * Design tokens. `colors` is a live object: the theme provider writes the
 * active palette into it before rendering, and themed components re-render
 * when the theme changes (see src/store/theme-store.tsx).
 */

export interface Palette {
  background: string;
  backgroundRaised: string;
  card: string;
  cardBorder: string;
  cardGreen: string;
  cardGreenDeep: string;
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Text and icons drawn on top of an accent fill. */
  onAccent: string;
  mint: string;
  yellow: string;
  lilac: string;
  orange: string;
  red: string;
  white: string;
}

export type ResolvedTheme = 'light' | 'dark';

export const DARK_PALETTE: Palette = {
  background: '#0D0F0E',
  backgroundRaised: '#121514',
  card: '#171B19',
  cardBorder: '#232826',
  cardGreen: '#1B2B26',
  cardGreenDeep: '#14211D',
  surface: '#202523',
  text: '#F4F5F4',
  textMuted: '#8C918E',
  textFaint: '#4A4F4C',
  onAccent: '#0D0F0E',
  mint: '#A8E8DA',
  yellow: '#ECE9A5',
  lilac: '#D7B6F4',
  orange: '#F5782C',
  red: '#F25F5C',
  white: '#FFFFFF',
};

export const LIGHT_PALETTE: Palette = {
  background: '#F5F6F4',
  backgroundRaised: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E0E4E1',
  cardGreen: '#E2F3EE',
  cardGreenDeep: '#D2EAE2',
  surface: '#ECEFEC',
  text: '#151917',
  textMuted: '#5E6661',
  textFaint: '#A2A8A4',
  onAccent: '#0D0F0E',
  mint: '#1F9E86',
  yellow: '#A89A1F',
  lilac: '#8A5CC2',
  orange: '#D9611F',
  red: '#D33F3B',
  white: '#FFFFFF',
};

export const colors: Palette = { ...DARK_PALETTE };

/** Copies the chosen palette into the shared `colors` object. */
export function applyPalette(theme: ResolvedTheme): void {
  Object.assign(colors, theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE);
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;
