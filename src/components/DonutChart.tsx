import { useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

export interface DonutSegment {
  value: number; // fraction of the whole, 0..1
  color: string;
}

interface DonutChartProps {
  size: number;
  thickness?: number;
  segments: DonutSegment[];
  children?: React.ReactNode;
}

/** Multi-segment donut. Segments run clockwise from 12 o'clock. */
export function DonutChart({ size, thickness = 16, segments, children }: DonutChartProps) {
  useThemeVersion();
  const c = size / 2;
  const r = size / 2 - thickness / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={colors.surface} strokeWidth={thickness} fill="none" />
        {segments.map((segment, index) => {
          const length = circumference * Math.min(Math.max(segment.value, 0), 1);
          const start = offset;
          offset += length;
          return (
            <Circle
              key={index}
              cx={c}
              cy={c}
              r={r}
              stroke={segment.color}
              strokeWidth={thickness}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(length - thickness * 0.3, 0)} ${circumference}`}
              strokeDashoffset={-start}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
        })}
      </Svg>
      {children ? <View style={StyleSheet.absoluteFill}>{children}</View> : null}
    </View>
  );
}
