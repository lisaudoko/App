import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';

/**
 * Thin wrapper around expo-calendar plus a local id-mapping store. Device
 * calendar event ids are per-device by nature (two of an athlete's devices
 * would each get their own native event for the same meet) — deliberately
 * kept in AsyncStorage only, never written to Supabase, following this
 * codebase's existing direct-AsyncStorage convention (themeStore.ts,
 * authStore.ts, useAthleteSelf.ts) rather than a new abstraction.
 */

export type CalendarPermissionStatus = 'granted' | 'denied' | 'undetermined';

function toStatus(status: Calendar.PermissionStatus): CalendarPermissionStatus {
  if (status === Calendar.PermissionStatus.GRANTED) return 'granted';
  if (status === Calendar.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function getCalendarPermissionStatus(): Promise<CalendarPermissionStatus> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return toStatus(status);
}

export async function requestCalendarPermission(): Promise<CalendarPermissionStatus> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return toStatus(status);
}

const CALENDAR_NAME = 'TRU Performance';
let cachedCalendarId: string | null = null;

/** Resolves (creating if necessary) a calendar this app can write events into. */
async function getWritableCalendarId(): Promise<string> {
  if (cachedCalendarId) return cachedCalendarId;

  if (Platform.OS === 'ios') {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = calendars.find((c) => c.title === CALENDAR_NAME) ?? calendars.find((c) => c.allowsModifications);
    if (existing) {
      cachedCalendarId = existing.id;
      return existing.id;
    }
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    const id = await Calendar.createCalendarAsync({
      title: CALENDAR_NAME,
      color: '#1D9E75',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: CALENDAR_NAME,
      ownerAccount: defaultCalendar.source.name,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    cachedCalendarId = id;
    return id;
  }

  // Android
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === CALENDAR_NAME) ?? calendars.find((c) => c.allowsModifications);
  if (existing) {
    cachedCalendarId = existing.id;
    return existing.id;
  }
  const id = await Calendar.createCalendarAsync({
    title: CALENDAR_NAME,
    color: '#1D9E75',
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: CALENDAR_NAME, type: Calendar.SourceType.LOCAL },
    name: CALENDAR_NAME,
    ownerAccount: CALENDAR_NAME,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  cachedCalendarId = id;
  return id;
}

export interface DeviceCalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
}

export async function addEventToDeviceCalendar(event: DeviceCalendarEvent): Promise<string> {
  const calendarId = await getWritableCalendarId();
  return Calendar.createEventAsync(calendarId, {
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    notes: event.notes,
    alarms: [{ relativeOffset: -60 }],
  });
}

export async function updateDeviceCalendarEvent(nativeEventId: string, patch: Partial<DeviceCalendarEvent>): Promise<void> {
  await Calendar.updateEventAsync(nativeEventId, {
    title: patch.title,
    startDate: patch.startDate,
    endDate: patch.endDate,
    location: patch.location,
    notes: patch.notes,
  });
}

export async function removeDeviceCalendarEvent(nativeEventId: string): Promise<void> {
  await Calendar.deleteEventAsync(nativeEventId);
}

// --- Local id-mapping store -------------------------------------------------

const STORAGE_KEY = 'tru.deviceCalendar.eventMap.v1';

async function readMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/** appKey is a meetId, or a `${workoutId}:${weekNumber}:${day}` composite for a training day. */
export async function getDeviceCalendarEventId(appKey: string): Promise<string | null> {
  const map = await readMap();
  return map[appKey] ?? null;
}

export async function setDeviceCalendarEventId(appKey: string, nativeEventId: string): Promise<void> {
  const map = await readMap();
  map[appKey] = nativeEventId;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function deleteDeviceCalendarEventId(appKey: string): Promise<void> {
  const map = await readMap();
  delete map[appKey];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
