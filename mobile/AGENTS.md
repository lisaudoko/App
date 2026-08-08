# Expo HAS CHANGED

This project is pinned to **Expo SDK 57** (not the latest SDK). Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code, and do not upgrade the `expo` package or its native module versions without explicit instruction.

Notable SDK 57 changes from the 54 baseline: New Architecture is mandatory (`newArchEnabled` removed from app.json). `expo-router` no longer depends on `@react-navigation/*` — import `useFocusEffect`/`ThemeProvider`/`DefaultTheme`/`DarkTheme` from `expo-router/react-navigation` instead. `expo-calendar`'s default export is now the object-oriented "Next" API (`getCalendars`, `createCalendar`, `calendar.createEvent()`, `ExpoCalendarEvent.get(id).update()/.delete()`); the old `*Async` free functions (`getCalendarsAsync`, `createEventAsync`, etc.) still type-check but throw at runtime — see `src/lib/deviceCalendar.ts`. `PermissionStatus` now comes from the `expo` package, not `expo-calendar`.
