# TRU Performance — Mobile App

React Native mobile app for the Throwers R Us coaching platform, built with **Expo SDK 54** and **Expo Router**. One app, two experiences: coaches and athletes log in to the same download and see different screens.

This is the **mobile app only**. A web dashboard is planned separately.

## Status: mock-data build

This build runs entirely against a local mock data layer (seeded seed data + `AsyncStorage`), so it runs standalone with no backend to stand up. All data access goes through `src/data/repository.ts` — swapping in a real backend (Supabase, per the original spec) later means reimplementing that one file; no screen code should need to change.

The **AI Coach Assistant** is a local heuristic (`src/engine/aiAssistant.ts`) that reads the same derived stats every screen uses and answers in plain English. It is *not* calling Claude or any LLM API. The call site is intentionally a single function so a real API call can replace it later.

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (SDK 54 compatible build), or press `i` / `a` for a simulator/emulator.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Coach (H. Michael Vassell) | `coach@tru.app` | `password123` |
| Athlete (Marcus Thompson) | `marcus@tru.app` | `password123` |

Every seeded athlete has an account at `{firstname}@tru.app` / `password123` (simone, kezia, devon, andre, tiana). The login screen has one-tap "Demo Coach" / "Demo Athlete" buttons.

Sign-up also works: coaches create a new programme; athletes join with the code `TRU2026`.

## What's implemented

- **Auth & role routing** — email/password login & signup (coach vs. athlete), session persisted locally, route groups gated on role (`app/(coach)`, `app/(athlete)`).
- **Coach**: squad overview, per-athlete report (trajectory + projection, load/RPE, strength progression, strength↔throw correlation, peak-timing indicator), squad RPE heatmap, qualifying standards tracker (multi-meet), AI assistant, notifications.
- **Athlete**: today's workout (auto-generated from 1RM maxes + mesocycle week, tap to check off), progress (trajectory, strength gauges, qualifying gap), weekly logger (natural-language parsing + manual fields + wellness sliders), profile.
- **Derived-stats engine** (`src/engine/`) — linear-regression trajectory projection, acute:chronic training load ratio, peak-timing heuristic, Pearson correlation, anomaly detection, 1RM-based workout generator. All computed client-side from logged data, not hardcoded.
- **Dark mode** — Light / Dark / System, persisted, in Settings.
- **Delete account** — in Settings, type-to-confirm, permanently removes the account and (for athletes) their athlete record/logs from the mock store.
- **Optimistic updates** — workout set check-off and weekly result submission update the UI immediately and persist in the background.
- **Pull-to-refresh** on all list/data screens.
- **No rubber-band overscroll** on screens without pull-to-refresh; screens with pull-to-refresh keep the minimum bounce iOS needs to trigger it (see comment in `src/components/Screen.tsx` — the two aren't fully compatible, this is the standard resolution).
- **Safe-area insets** throughout via `react-native-safe-area-context`.
- **Moti** (Reanimated-based) for transitions/micro-interactions — the practical React Native equivalent of Framer Motion, which is web-only and doesn't run in RN.
- Local (on-device) notification when an athlete logs a new personal best — not a push notification; there's no push server in this build.

## Not implemented (by design, this pass)

- Real backend / multi-tenant programmes / Supabase auth — mock data only, see above.
- Real AI assistant (Claude API call) — local heuristic stand-in.
- Coach broadcast, session notes, multi-coach roles, custom fields, configuration wizard, competition-day mode — these are in the original spec but out of scope for this pass.
- Web dashboard.

## Before submitting to the App Store / Play Store

This project is configured to pass `expo-doctor` and build cleanly, but a few things need real values before you can actually submit:

1. **Bundle identifiers** — `app.json` currently uses placeholder `com.nexgenoptimize.truperformance` for both `ios.bundleIdentifier` and `android.package`. Replace with your real reverse-DNS identifier registered in your Apple Developer / Google Play Console accounts.
2. **App icons & splash** — `assets/icon.png`, `assets/android-icon-*.png`, `assets/splash-icon.png` are the default Expo placeholders. Replace with real branded assets before submitting.
3. **Privacy policy URL** — both stores require one for an app with accounts and account deletion. This isn't an in-app config value — it's entered in App Store Connect / Play Console when you set up the listing. You'll need to host a real privacy policy page somewhere and link it there.
4. **Account deletion** — Apple guideline 5.1.1(v) requires in-app account deletion for apps with account creation, which this app has (Settings → Delete account). Make sure this is equally true once a real backend replaces the mock store.
5. **EAS project** — run `eas init` (from the `eas-cli` package) to link this app to an Expo/EAS project before running `eas build` / `eas submit`. There's no `eas.json` in this repo yet.
6. **Push notifications** — if you want real cross-device push (not just the local on-device PB notification implemented here), you'll need an Expo push token flow wired to a backend, plus the relevant Apple Push (APNs key) / FCM setup.
7. **Screenshots & store listing copy** — required by both stores, not part of this codebase.
