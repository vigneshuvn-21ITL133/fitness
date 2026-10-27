# Issues and status

Tracks GitHub issue #1 (Fitness tracking, BMI and Health Benefits) and the original design review.

Project: Pulse Health (Expo SDK 58, React Native, TypeScript, Bun)
Design reference: "How're You Today?" health dashboard (home, health overview, sleep overview).

## Done

- [x] Project on Expo SDK 58 (expo 58.0.19, expo-router 58.0.26, react-native 0.88.0, react 19.3.0)
- [x] Bun for install and scripts (no pnpm/npm)
- [x] Five-tab navigator with the raised centre home button (`src/components/TabBar.tsx`)
- [x] Home dashboard: week strip, mood cycling on tap, Freud score dot grid, growth bars, weight ruler, mood donut
- [x] Health Overview: three progress rings, 7/14-day mood tracker, work/life balance bars
- [x] Sleep Overview: score arc (84%), sleep stats, stage timeline with stage percentages
- [x] Journal tab: last 14 days, set or clear a day's mood
- [x] Insights tab: rule-based tips from mood log, sleep and work hours
- [x] Settings tab: clear all mood data (with confirmation), app version
- [x] Mood data persisted with AsyncStorage
- [x] SVG charts (react-native-svg), dark theme tokens
- [x] Unit tests for date helpers (`bun test`)
- [x] Type check passes (`bun run typecheck`)
- [x] Android bundle exports cleanly (`bunx expo export --platform android`)

## Issue #1: Fitness tracking, BMI and Health Benefits (implemented)

- [x] Steps: device pedometer via expo-sensors with a permission prompt, manual entry fallback, manual overrides sensor, configurable goal (default 10,000), local-day reset, daily ring, 7-day history, distance and energy estimates
- [x] Blood pressure: systolic and diastolic entry in mmHg, validation (systolic must exceed diastolic), add/edit/delete, history, trend chart, ACC/AHA categories, not-a-diagnosis note, camera measurement not included
- [x] Weight: kg or lb, add/edit/delete, dated history, latest value, change since previous entry, trend chart, shown on the home card
- [x] Profile and BMI: age in years, height in cm or in, units preference, automatic BMI with adult WHO categories, under-18 guidance without an adult category, BMI scale
- [x] Health Benefits screen: educational cards with safety text and no disease-prevention claims
- [x] Fitness dashboard: steps, weight, blood pressure, BMI, quick actions, and a link from the Stats tab
- [x] Local-first storage in AsyncStorage (`pulse.health.v1`), separate from mock data, with malformed data dropped on load
- [x] Unit tests: BMI, validation, step tracking, weight changes, blood pressure, units, state sanitising (60 tests)

Known limits of the issue #1 work:
- The pedometer counts steps while the app is open on Android. iOS and Android both need motion permission. Background counting is not implemented.
- Distance and energy are estimates from height and weight.
- Under-18 BMI is not compared with percentile charts; the screen only says to ask a clinician.
- Age is entered in years rather than a date of birth.
- Not yet run on a device. Android testing is still required (acceptance criterion).

## Issue #3: Real-time tracking, GPS routes, profile, insights and privacy (implemented)

- [x] Live walk tracking (`app/tracking.tsx`): start, pause, resume, finish with confirmation; timer, steps, distance, pace and estimated kcal update live
- [x] Step counting per walk from the pedometer, with a manual step count fallback when the sensor is unavailable or denied
- [x] Optional GPS route (foreground only): accuracy filter (25 m), jitter filter (3 m), jump filter (12 m/s), haversine distance, pace in min/km
- [x] Route map using Leaflet and OpenStreetMap tiles inside a WebView (`src/components/RouteMap.tsx`)
- [x] Crash and interruption recovery: a heartbeat every 10 s; unfinished walks are saved as "interrupted" up to the last heartbeat
- [x] Walk history (`app/sessions.tsx`) and walk detail (`app/session.tsx`): stats, route, manual steps, delete with confirmation
- [x] Calorie estimate (MET × weight × hours) saved at finish with the weight used; the detail screen also shows a recalculated value at the current weight
- [x] Home "Today's movement" card: steps vs goal, estimated energy, distance, active time, latest walk, "Track a walk" action
- [x] Insights section (`computeInsights`): week-over-week steps, 7-day average, goal streak, weekly walk distance, longest walk, 30-day weight trend, goal suggestion, each with its period
- [x] Profile: optional name and fitness goal; "Clear personal data" deletes health and walk data after confirmation
- [x] Storage in AsyncStorage (`pulse.activity.v1`), malformed sessions and route points dropped on load
- [x] Unit tests: GPS point decisions, haversine, pace, MET and kcal, session transitions, recovery, state sanitising, insights
- [x] Type check, `bun test` and Android export pass

Known limits of the issue #3 work:
- Not run on a device. Pedometer, GPS permission flow, the WebView map and recovery after a kill are unverified on hardware.
- Foreground only. Walks are not recorded while the app is in the background or the screen is off. Background location is not implemented.
- The map loads Leaflet from unpkg and tiles from OpenStreetMap. It needs internet, and OSM's tile usage policy applies.
- Calorie figures are estimates. They are not measured energy expenditure.
- Step counts are the pedometer steps between the start and end of each running period (paused time is excluded). A manual count overrides them.
- No profile photo.

## Open

1. **Not verified on a device.** This includes the new step sensor, permission flow and forms. Nothing has been run in a simulator or on a phone. Visual match to the design is unchecked.
2. **Sample data only.** Health Overview ring values, the Week/Month/Year sleep history, and work/life hours come from `src/data/mock.ts`. There is no real data source.
3. **Sleep ranges.** Selecting Week, Month or Year on Sleep Overview shows the same sample data with a note. Real history needs a data source.
4. **Sleep totals differ from the design.** The stage data gives 8h 50m asleep; the design shows 7h 30m. Stage percentages are computed from the sample stages.
5. **Freud score dot grid.** 36/375 lights 4 of 42 cells. It is accurate, but the design shows a denser grid. Confirm the intended mapping.
6. **Weight ruler is read-only.** The design suggests dragging or adjusting the weight; this isn't implemented.
7. **Notification badge is static.** The bell count (3) is local state with no source.
8. **Work/Life "Today" pill is static.** There is no Week option for work/life.
9. **Sleep score arrow is not wired.** The "Score >" row has no action.
10. **No app icon or splash screen.** `icon` was removed from `app.json` because the asset doesn't exist yet.
11. **Commit author.** Commits use the name "Claude"; change to the project owner's identity if preferred.
12. **GitHub issue not created.** The token available to the session cannot create issues. This file is the issue note; copy it into a GitHub issue if needed.

## Next steps

- Confirm the Freud score mapping and sleep-range behavior with the product owner.
- Connect a real data source (HealthKit / Health Connect or a backend) and replace `src/data/mock.ts`.
- Add an app icon and splash screen.
- Run on iOS and Android, then compare screen by screen against the design.

## Heart-rate tap count (implemented)

- [x] Heart rate screen (`app/heart-rate.tsx`): "Count by tapping" starts a 15-second window; each tap counts one beat; BPM = taps × 60 / 15 (`src/domain/heartTap.ts`)
- [x] Tap readings are saved with source `tap` and labelled "Tap count" in the latest reading and history; typed readings stay "Manual entry"
- [x] Labelled as a count of taps, not a sensor reading; the sensor-free limit is stated on the screen
- [x] Tap counts outside 30–220 bpm are refused with a message
- [x] Unit tests: tap-to-bpm scaling, rounding, invalid counts, range checks

Known limits of the tap count:
- Accuracy depends on the user tapping each beat; it is not a sensor reading.
- Finger-sensor (camera) measurement is not implemented.

## Moods from today, suggestions and health benefits (implemented)

- [x] Moods start empty: the sample week is no longer seeded. Only moods the user enters are counted.
- [x] Moods are recorded from today onwards; past days are read-only in Journal and the home week row (`canRecordMood`)
- [x] Home Mood Statistic donut and legend are computed from logged moods (Loved counts as Happy). No sample shares.
- [x] Insights: "Suggestions" section built on this device from steps, moods, blood pressure, heart rate and adult BMI (`src/domain/suggestions.ts`). Each has a health benefit line.
- [x] Insights links to the Health Benefits page

Known limits:
- Suggestions are rule-based, not a generative AI model. A real AI model needs a server with its own API key, which is not in this app.
- Past days cannot be backfilled.
