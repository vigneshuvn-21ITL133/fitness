import { useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { colors } from '@/theme';

export interface RingSpec {
  progress: number; // 0..1
  color: string;
}

interface RingChartProps {
  size: number;
  rings: RingSpec[];
  strokeWidth?: number;
  gap?: number;
  children?: React.ReactNode;
}

/**
 * Concentric progress rings with rounded caps and a knob at each arc's end,
 * matching the "Health Overview" design. Arcs start at 12 o'clock and run
 * clockwise.
 */
export function RingChart({
  size,
  rings,
  strokeWidth = 26,
  gap = 8,
  children,
}: RingChartProps) {
  useThemeVersion();
  const cx = size / 2;
  const cy = size / 2;
  const knobRadius = strokeWidth / 2 - 4;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {rings.map((ring, index) => {
          const r = size / 2 - strokeWidth / 2 - index * (strokeWidth + gap);
          const circumference = 2 * Math.PI * r;
          const progress = Math.min(Math.max(ring.progress, 0), 1);
          const angle = -Math.PI / 2 + progress * 2 * Math.PI;
          const knobX = cx + r * Math.cos(angle);
          const knobY = cy + r * Math.sin(angle);

          return (
            <G key={index}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={colors.surface}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={0.55}
              />
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={ring.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circumference * progress} ${circumference}`}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
              {progress > 0 && progress < 1 && (
                <Circle
                  cx={knobX}
                  cy={knobY}
                  r={knobRadius}
                  fill={colors.background}
                  stroke={colors.text}
                  strokeWidth={2}
                />
              )}
            </G>
          );
        })}
      </Svg>
      {children ? <View style={StyleSheet.absoluteFill}>{children}</View> : null}
    </View>
  );
}
