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
