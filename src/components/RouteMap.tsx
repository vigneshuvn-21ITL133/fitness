import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { colors, radius } from '@/theme';

/**
 * react-native-webview forwards its ref at runtime (injectJavaScript is available),
 * but its published typings declare a plain function component. Use the real shape.
 */
interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}
const RefWebView = WebView as unknown as React.ForwardRefExoticComponent<
  React.ComponentProps<typeof WebView> & React.RefAttributes<WebViewHandle>
>;

export interface MapPoint {
  lat: number;
  lng: number;
}

interface RouteMapProps {
  points: MapPoint[];
  /** The device's current position, shown as a blue dot and used to centre the map. */
  current?: MapPoint | null;
  height?: number;
}

const LEAFLET_VERSION = '1.9.4';

/** Only the page itself, Leaflet's script and OpenStreetMap tiles may load. */
function isAllowedUrl(url: string): boolean {
  return (
    url.startsWith('about:blank') ||
    url.startsWith('data:') ||
    url.startsWith('https://unpkg.com/') ||
    url.startsWith('https://tile.openstreetmap.org/')
  );
}

/** Only finite numbers are sent to the page, so no raw input reaches the script. */
function cleanPoints(points: MapPoint[]): MapPoint[] {
  return points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((p) => ({ lat: p.lat, lng: p.lng }));
}

function cleanCurrent(point: MapPoint | null | undefined): MapPoint | null {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  return { lat: point.lat, lng: point.lng };
}

function buildHtml(): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: #0D0F0E; }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  var line = L.polyline([], { color: '#A8E8DA', weight: 4 }).addTo(map);
  var head = L.circleMarker([0, 0], { radius: 6, color: '#ECE9A5', fillColor: '#ECE9A5', fillOpacity: 1 });
  var you = L.circleMarker([0, 0], { radius: 8, color: '#FFFFFF', weight: 3, fillColor: '#3B82F6', fillOpacity: 1 });
  var started = false;
  var currentPt = null;

  function setCurrent(p) {
    currentPt = p;
    if (!p) {
      if (map.hasLayer(you)) map.removeLayer(you);
      return;
    }
    you.setLatLng([p.lat, p.lng]);
    if (!map.hasLayer(you)) you.addTo(map);
    if (!started) map.setView([p.lat, p.lng], 16);
  }

  function setPoints(pts) {
    var latlngs = pts.map(function (p) { return [p.lat, p.lng]; });
    line.setLatLngs(latlngs);
    if (latlngs.length === 0) {
      if (!started) {
        if (currentPt) map.setView([currentPt.lat, currentPt.lng], 16);
        else map.setView([0, 0], 2);
      }
      if (map.hasLayer(head)) map.removeLayer(head);
      return;
    }
    var last = latlngs[latlngs.length - 1];
    head.setLatLng(last);
    if (!map.hasLayer(head)) head.addTo(map);
    if (latlngs.length === 1) {
      map.setView(last, 17);
    } else {
      map.fitBounds(line.getBounds(), { padding: [24, 24], maxZoom: 18 });
    }
    started = true;
  }

  window.setPoints = setPoints;
  window.setCurrent = setCurrent;
</script>
</body>
</html>`;
}

/**
 * OpenStreetMap map with the recorded route drawn as a line (Leaflet in a WebView).
 * Needs internet for map tiles. Attribution is shown in the map.
 */
export function RouteMap({ points, current = null, height = 220 }: RouteMapProps) {
  const styles = useThemedStyles(makeStyles);
  const cleaned = useMemo(() => cleanPoints(points), [points]);
  const cleanedCurrent = useMemo(() => cleanCurrent(current), [current?.lat, current?.lng]);
  const html = useMemo(() => buildHtml(), []); // loaded once; later updates go via injection
  const webRef = useRef<WebViewHandle>(null);

  // The page can finish loading after the first update, so the latest state is
  // pushed again on load. Refs keep that push current without re-creating it.
  const pointsRef = useRef(cleaned);
  const currentRef = useRef(cleanedCurrent);
  pointsRef.current = cleaned;
  currentRef.current = cleanedCurrent;

  const push = useCallback(() => {
    webRef.current?.injectJavaScript(
      `window.setCurrent(${JSON.stringify(currentRef.current)}); window.setPoints(${JSON.stringify(pointsRef.current)}); true;`,
    );
  }, []);

  useEffect(() => {
    push();
  }, [cleaned, cleanedCurrent, push]);

  return (
    <View style={[styles.wrap, { height }]}>
      {cleaned.length === 0 ? (
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyText}>
            {cleanedCurrent ? 'Your location. The route appears as you walk.' : 'Finding your location…'}
          </Text>
        </View>
      ) : null}
      <RefWebView
        ref={webRef}
        originWhitelist={['https://*', 'http://*']}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        onLoadEnd={push}
        onShouldStartLoadWithRequest={(req: WebViewNavigation) => isAllowedUrl(req.url)}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  web: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
