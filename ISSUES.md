# Issues and status

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

## Open

1. **Not verified on a device.** Nothing has been run in a simulator or on a phone. Visual match to the design is unchecked.
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
