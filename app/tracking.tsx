import { useThemedStyles, useThemeVersion } from '@/store/theme-store';
import type { Palette } from '@/theme';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormField } from '@/components/FormField';
import { RouteMap } from '@/components/RouteMap';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  activeMsNow,
  DEFAULT_WEIGHT_KG,
  estimateSessionKcal,
  MAX_ACCURACY_M,
  paceMinPerKm,
} from '@/domain/activity';
import { latestWeight } from '@/domain/healthState';
import { formatClock, formatDuration, formatKm, formatPace } from '@/domain/format';
import { useLocationRoute, type LocationStatus } from '@/hooks/useLocationRoute';
import { type StepSensorStatus, useStepSensor } from '@/hooks/useStepSensor';
import { stepsBetween, useActivity } from '@/store/activity-store';
import { useHealth } from '@/store/health-store';
import { colors, spacing } from '@/theme';

const SENSOR_TEXT: Record<StepSensorStatus, string> = {
  checking: 'Checking the step sensor…',
  unavailable: 'No step sensor on this device. Steps can be entered after the walk.',
  'permission-needed': 'Allow motion access to count steps during a walk.',
  denied: 'Motion access is off. Steps can be entered after the walk.',
  ready: 'Step sensor ready.',
  error: 'The step sensor returned an error.',
};

const LOCATION_TEXT: Record<LocationStatus, string> = {
  off: 'GPS is off for this walk.',
  'permission-needed': 'Location permission is needed to record the route.',
  denied: 'Location is off. The walk will record steps and time only.',
  recording: 'Recording your route. Location is used only while this walk is active.',
  error: 'GPS could not start. The walk will continue without a route.',
};

export default function TrackingScreen() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { state: health, setSensor } = useHealth();
  const { state: activity, active, start, pause, resume, stop, checkpoint, addPoint } = useActivity();

  const sensor = useStepSensor({ onSteps: (dayKey, count) => setSensor(dayKey, count) });

  const [gpsWanted, setGpsWanted] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [liveSteps, setLiveSteps] = useState(0);

  const isRunning = active?.status === 'active';
  const weightKg = latestWeight(health.weights)?.kg ?? DEFAULT_WEIGHT_KG;
  const usingDefaultWeight = latestWeight(health.weights) === null;

  const location = useLocationRoute({
    enabled: !!active && isRunning && active.gps,
    onPoint: addPoint,
  });

  // Clock tick while a session is active or paused.
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active?.id, active?.status]);

  // Heartbeat so a crash only loses the last few seconds.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => checkpoint(), 10_000);
    return () => clearInterval(id);
  }, [isRunning, checkpoint]);

  // Live step count from the pedometer for the current window.
  useEffect(() => {
    if (!active) {
      setLiveSteps(0);
      return;
    }
    if (!isRunning || sensor.status !== 'ready') {
      setLiveSteps(active.steps);
      return;
    }
    let cancelled = false;
    const update = async () => {
      const inWindow = await stepsBetween(active.stepRunStart, Date.now());
      if (!cancelled) setLiveSteps(active.steps + inWindow);
    };
    update();
    const id = setInterval(update, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, isRunning, sensor.status]);

  const elapsedMs = active ? activeMsNow(active, now) : 0;
  const distanceM = active?.distanceM ?? 0;
  const pace = paceMinPerKm(distanceM, elapsedMs);
  const liveKcal = active ? estimateSessionKcal(weightKg, elapsedMs, distanceM) : 0;

  const interrupted = useMemo(
    () => activity.sessions.filter((s) => s.status === 'interrupted').sort((a, b) => b.startedAt - a.startedAt)[0],
    [activity.sessions],
  );

  const onStart = () => {
    if (!active) start(gpsWanted);
  };

  const onPause = async () => {
    if (!active || !isRunning) return;
    const inWindow = await stepsBetween(active.stepRunStart, Date.now());
    pause(inWindow);
  };

  const onStop = () => {
    if (!active) return;
    Alert.alert('Finish this walk?', 'The walk will be saved with its time, distance and steps.', [
      { text: 'Keep walking', style: 'cancel' },
      {
        text: 'Finish',
        style: 'destructive',
        onPress: async () => {
          const inWindow = isRunning ? await stepsBetween(active.stepRunStart, Date.now()) : 0;
          stop(inWindow, weightKg);
        },
      },
    ]);
  };

  // Once denied with "don't ask again", the system shows no prompt, so send the
  // user to app settings instead.
  const needsSettings = sensor.status === 'denied' && sensor.canAskAgain === false;
  const onAllowPress = () => {
    if (needsSettings) {
      Linking.openSettings().catch(() => {
        // Some devices cannot open the settings page; nothing else to do.
      });
      return;
    }
    sensor.requestPermission();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Tracking" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {interrupted ? (
          <Card style={styles.notice}>
            <Text style={styles.noticeText}>
              A walk from {formatClock(interrupted.startedAt)}{' '}
              was interrupted. It was saved up to its last update.
            </Text>
            <Button label="View walks" variant="secondary" onPress={() => router.navigate('/sessions')} />
          </Card>
        ) : null}

        <Card>
          <Text style={styles.statusText}>{SENSOR_TEXT[sensor.status]}</Text>
          {sensor.status === 'permission-needed' || sensor.status === 'denied' ? (
            <Text style={styles.explain}>
              Motion data is used only to count steps on this device. It is not uploaded.
            </Text>
          ) : null}
          {sensor.status === 'permission-needed' || sensor.status === 'denied' ? (
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={needsSettings ? 'Open app settings' : 'Allow motion access'}
                onPress={onAllowPress}
              />
            </View>
          ) : null}
          {sensor.status === 'error' ? (
            <>
              <Text style={styles.explain}>
                {sensor.lastError ?? 'The step sensor did not return a value.'}
              </Text>
              <View style={{ marginTop: spacing.md }}>
                <Button label="Try again" variant="secondary" onPress={sensor.retry} />
              </View>
            </>
          ) : null}
        </Card>

        {!active ? (
          <Card>
            <Text style={styles.cardTitle}>Start a walk</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Record GPS route</Text>
                <Text style={styles.explain}>
                  Location is requested only when a GPS walk starts, and only while it is recording.
                </Text>
              </View>
              <Switch
                value={gpsWanted}
                onValueChange={setGpsWanted}
                accessibilityLabel="Record GPS route"
                trackColor={{ true: colors.mint, false: colors.surface }}
              />
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <Button label="Start walk" onPress={onStart} />
            </View>
          </Card>
        ) : (
          <>
            <Card style={styles.live}>
              {active.gps && isRunning ? (
                <View style={styles.recordingRow}>
                  <View style={styles.recDot} />
                  <Text style={styles.recText}>Recording location</Text>
                </View>
              ) : null}
              <Text style={styles.statusLabel}>
                {active.status === 'paused' ? 'Paused' : isRunning ? 'Walking' : 'Finished'}
              </Text>
              <Text style={styles.timer}>{formatDuration(elapsedMs)}</Text>
              <View style={styles.statsRow}>
                <Stat value={liveSteps.toLocaleString('en-US')} label="Steps" />
                <Stat value={formatKm(distanceM)} label="Distance" />
                <Stat value={formatPace(pace)} label="Pace" />
              </View>
              <Text style={styles.estimate}>
                About {liveKcal} kcal (estimate{usingDefaultWeight ? `, ${DEFAULT_WEIGHT_KG} kg default weight` : `, ${weightKg.toFixed(1)} kg`})
              </Text>
              {location.status !== 'off' ? (
                <>
                  <Text style={styles.explain}>{LOCATION_TEXT[location.status]}</Text>
                  {location.status === 'error' && location.lastError ? (
                    <Text style={styles.explain}>{location.lastError}</Text>
                  ) : null}
                </>
              ) : null}
            </Card>

            {active.gps ? (
              <>
                <RouteMap
                  points={active.route.map((p) => ({ lat: p.lat, lng: p.lng }))}
                  current={location.current}
                  height={240}
                />
                {active.route.length === 0 && location.status === 'recording' ? (
                  <Text style={styles.explain}>
                    Waiting for a GPS fix. Current accuracy:{' '}
                    {location.lastAccuracy !== null ? `${Math.round(location.lastAccuracy)} m` : 'not known yet'}.
                    Points are kept only when accuracy is {MAX_ACCURACY_M} m or better, so an open outdoor spot works best.
                  </Text>
                ) : null}
              </>
            ) : null}

            <View style={styles.controls}>
              {active.status === 'paused' ? (
                <Button label="Resume" onPress={resume} style={styles.grow} />
              ) : (
                <Button label="Pause" variant="secondary" onPress={onPause} style={styles.grow} />
              )}
              <Button label="Finish" variant="danger" onPress={onStop} style={styles.grow} />
            </View>

            {sensor.status !== 'ready' ? (
              <Text style={styles.explain}>
                Steps are not counted automatically right now. You can enter them on the walk's page after you finish.
              </Text>
            ) : null}
          </>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.navigate('/sessions')}>
          <Card>
            <Text style={styles.cardTitle}>Past walks</Text>
            <Text style={styles.explain}>
              {activity.sessions.length === 0
                ? 'No walks recorded yet.'
                : `${activity.sessions.length} walk${activity.sessions.length === 1 ? '' : 's'} saved on this device.`}
            </Text>
          </Card>
        </Pressable>

        <Text style={styles.footnote}>
          Calories and distance are estimates. Steps come from your device sensor when it is available.
        </Text>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  notice: { borderColor: colors.yellow, gap: spacing.md },
  noticeText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  statusText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  explain: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  live: { alignItems: 'center', gap: spacing.sm },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  recText: { color: colors.red, fontSize: 12, fontWeight: '600' },
  statusLabel: { color: colors.textMuted, fontSize: 13 },
  timer: { color: colors.text, fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: spacing.md },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  estimate: { color: colors.textFaint, fontSize: 11, marginTop: spacing.sm, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: spacing.md },
  grow: { flex: 1 },
  footnote: { color: colors.textFaint, fontSize: 11, lineHeight: 16 },
});
