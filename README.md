# Pulse Health

A mobile health and wellness app built with **Expo (SDK 58)**, **React Native**, **TypeScript** and **Bun**.
It reproduces the "How're You Today?" design: a home dashboard, a Health Overview screen, and a Sleep Overview screen.

## Features

- **Home dashboard**
  - Week strip (Sun → Sat). Tap a day to select it; tap its face to cycle the mood (none → happy → sad → angry → loved → okay → none).
  - Freud Score card with a dot grid.
  - Growth card with month bars.
  - Weight ruler card. Tap it to open Health Overview.
  - Mood Statistic donut.
- **Health Overview** (Stats tab)
  - Three concentric progress rings: No Stress, Sleep Quality, Meditation.
  - Mood tracker strip for the last 7 or 14 days.
  - Work / Life balance bars.
  - Tap "Sleep Quality" to open Sleep Overview.
- **Sleep Overview**
  - Sleep score arc (84%).
  - Sleep time, irregular nights, and resting heart rate.
  - Sleep-stage timeline (awake / light / deep) with stage percentages.
- **Journal**: browse the last 14 days and set or clear any day's mood.
- **Insights**: rule-based tips from your mood log, sleep and work hours.
- **Settings**: clear all mood data (with confirmation) and view the app version.
- Mood data is saved on the device with AsyncStorage and survives restarts.

## Fitness tracking (issue #1)

- **Fitness** dashboard (reach it from the Stats tab): steps, weight, blood pressure, BMI and quick actions.
- **Steps**: reads the device pedometer (expo-sensors) after you allow motion access. Enter steps manually to override it or when no sensor is available.
- **Weight** and **Blood Pressure**: add, edit and delete entries; history and trend charts.
- **Profile**: age, height and units. BMI is shown with WHO adult categories; under-18s get guidance only.
- **Health Benefits**: general educational content with safety text.

All health data is stored only on this device, in AsyncStorage under `pulse.health.v1`. Nothing is sent to a server.

## Requirements

- [Bun](https://bun.sh) 1.1 or newer
- Node.js 20+ (used by some Expo tooling)
- iOS: Xcode and the iOS Simulator, or the Expo Go app on a device
- Android: Android Studio emulator, or the Expo Go app on a device

Do not use pnpm or npm for installs. The project is set up for Bun.

## Getting started

```bash
bun install
bun run start        # then press i (iOS), a (Android), or scan the QR code with Expo Go
```

Other scripts:

```bash
bun run typecheck    # TypeScript check (strict mode)
bun run test         # unit tests (bun test)
```

## Project structure

```
app/                     Expo Router routes
  _layout.tsx            Root stack, mood provider, load gate
  sleep.tsx              Sleep Overview (pushed from Health Overview)
  (tabs)/
    _layout.tsx          Five-tab navigator with custom tab bar
    index.tsx            Home dashboard
    stats.tsx            Health Overview
    journal.tsx          Mood journal
    insights.tsx         Insights
    settings.tsx         Settings
src/
  components/            Reusable UI and SVG charts (rings, donut, arc gauge, sleep stages, ...)
  data/mock.ts           Sample values taken from the design
  lib/date.ts            Local-date helpers
  store/mood-store.tsx   Persisted mood state (AsyncStorage)
  theme.ts               Colour, spacing and radius tokens
  types.ts               Shared types
```

## Notes

- Charts use `react-native-svg`, so they render the same on iOS and Android.
- Health Overview values and the Sleep Overview history (Week / Month / Year) are sample data from `src/data/mock.ts`. Connect a real data source by replacing that file.
- The app is portrait-only and targets phones.

## Fitness tracking and walks

- **Tracking** (`app/tracking.tsx`): start a walk, pause, resume and finish it. Steps come from the device pedometer; use manual entry when the sensor is unavailable.
- **GPS route** (optional, per walk): location is read only while the app is open and the walk is running. The route is drawn on an OpenStreetMap-based map. Background location is not used.
- **Walks** (`app/sessions.tsx`, `app/session.tsx`): history, details, manual step counts and deletion.
- **Insights**: fitness insights come from your steps, walks and weight entries, and each one states its period.
- **Privacy**: all data is stored on this device. Profile → "Clear personal data" removes health and walk data.
- The calorie figures are estimates, not measurements.
- Device testing (permissions, sensor, GPS, map) is still needed.
