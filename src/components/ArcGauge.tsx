import { useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

interface ArcGaugeProps {
  size: number;
  progress: number; // 0..1
  color?: string;
  /** Angle (degrees, SVG coords: 0 = right, 90 = down) where the arc starts. */
  startDeg?: number;
  /** Total arc span in degrees; the arc runs counter-clockwise from start. */
  spanDeg?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Thick arc path from `fromDeg` down to `toDeg` (decreasing angle). */
function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const a = polar(cx, cy, r, fromDeg);
  const b = polar(cx, cy, r, toDeg);
  const span = Math.abs(fromDeg - toDeg);
  const largeArc = span > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${largeArc} 0 ${b.x} ${b.y}`;
}

/**
 * Crescent-style score gauge (the moon arc on the Sleep Overview screen).
 * A dim track shows the full span; the coloured arc shows `progress`.
 */
export function ArcGauge({
  size,
  progress,
  color = colors.mint,
  startDeg = -55,
  spanDeg = 245,
  strokeWidth = 26,
  children,
}: ArcGaugeProps) {
  useThemeVersion();
  const c = size / 2;
  const r = size / 2 - strokeWidth / 2 - 2;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const endDeg = startDeg - spanDeg * clamped;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Path
          d={arcPath(c, c, r, startDeg, startDeg - spanDeg)}
          stroke={colors.surface}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        {clamped > 0 && (
          <Path
            d={arcPath(c, c, r, startDeg, endDeg)}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>
      {children ? <View style={StyleSheet.absoluteFill}>{children}</View> : null}
    </View>
  );
}
