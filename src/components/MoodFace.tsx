import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';
import type { MoodKey } from '@/types';

interface MoodFaceProps {
  mood?: MoodKey;
  size?: number;
}

const INK = '#0D0F0E';

const FILL: Record<MoodKey, string> = {
  happy: colors.mint,
  sad: colors.yellow,
  angry: colors.orange,
  love: colors.lilac,
  neutral: colors.surface,
};

/**
 * Emoji-style mood face drawn with SVG so it looks identical on iOS and
 * Android. Without a mood it renders the faint outline face from the design.
 */
export function MoodFace({ mood, size = 30 }: MoodFaceProps) {
  if (!mood) {
    return (
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Circle cx={16} cy={16} r={14.5} stroke={colors.textFaint} strokeWidth={1.5} fill="none" />
        <Path d="M10 19 q6 4 12 0" stroke={colors.textFaint} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Circle cx={12} cy={13} r={1.3} fill={colors.textFaint} />
        <Circle cx={20} cy={13} r={1.3} fill={colors.textFaint} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15} fill={FILL[mood]} />
      {mood === 'happy' && (
        <>
          <Path d="M9.5 13.5 q2.5 -3 5 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Path d="M17.5 13.5 q2.5 -3 5 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Path d="M10 19 q6 6 12 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === 'sad' && (
        <>
          <Path d="M9.5 14 q2.5 2 5 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Path d="M17.5 14 q2.5 2 5 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Path d="M11 23 q5 -5 10 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === 'angry' && (
        <>
          <Path d="M8.5 10.5 L14 13" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M23.5 10.5 L18 13" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx={12} cy={15.5} r={1.6} fill={INK} />
          <Circle cx={20} cy={15.5} r={1.6} fill={INK} />
          <Path d="M11 23 q5 -5 10 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === 'love' && (
        <>
          <Circle cx={12} cy={14} r={3} fill={colors.white} />
          <Circle cx={20} cy={14} r={3} fill={colors.white} />
          <Circle cx={12} cy={14} r={1.4} fill={INK} />
          <Circle cx={20} cy={14} r={1.4} fill={INK} />
          <Path d="M10 20 q6 5 12 0" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === 'neutral' && (
        <>
          <Circle cx={12} cy={14} r={1.5} fill={colors.textMuted} />
          <Circle cx={20} cy={14} r={1.5} fill={colors.textMuted} />
          <Path d="M11 21 H21" stroke={colors.textMuted} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}
