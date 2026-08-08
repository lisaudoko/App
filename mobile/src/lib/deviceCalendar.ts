import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionStatus } from 'expo';
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

function toStatus(status: PermissionStatus): CalendarPermissionStatus {
  if (status === PermissionStatus.GRANTED) return 'granted';
  if (status === PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function getCalendarPermissionStatus(): Promise<CalendarPermissionStatus> {
  const { status } = await Calendar.getCalendarPermissions();
  return toStatus(status);
}

export async function requestCalendarPermission(): Promise<CalendarPermissionStatus> {
  const { status } = await Calendar.requestCalendarPermissions();
  return toStatus(status);
}

const CALENDAR_NAME = 'TRU Performance';
let cachedCalendar: Calendar.ExpoCalendar | null = null;

/** Resolves (creating if necessary) a calendar this app can write events into. */
async function getWritableCalendar(): Promise<Calendar.ExpoCalendar> {
  if (cachedCalendar) return cachedCalendar;

  if (Platform.OS === 'ios') {
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    const existing = calendars.find((c) => c.title === CALENDAR_NAME) ?? calendars.find((c) => c.allowsModifications);
    if (existing) {
      cachedCalendar = existing;
      return existing;
    }
    const defaultCalendar = Calendar.getDefaultCalendarSync();
    const created = await Calendar.createCalendar({
      title: CALENDAR_NAME,
      color: '#1D9E75',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: CALENDAR_NAME,
      ownerAccount: defaultCalendar.source.name,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    cachedCalendar = created;
    return created;
  }

  // Android
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === CALENDAR_NAME) ?? calendars.find((c) => c.allowsModifications);
  if (existing) {
    cachedCalendar = existing;
    return existing;
  }
  const created = await Calendar.createCalendar({
    title: CALENDAR_NAME,
    color: '#1D9E75',
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: CALENDAR_NAME, type: Calendar.SourceType.LOCAL },
    name: CALENDAR_NAME,
    ownerAccount: CALENDAR_NAME,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  cachedCalendar = created;
  return created;
}

export interface DeviceCalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
}

export async function addEventToDeviceCalendar(event: DeviceCalendarEvent): Promise<string> {
  const calendar = await getWritableCalendar();
  const created = await calendar.createEvent({
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    notes: event.notes,
    alarms: [{ relativeOffset: -60 }],
  });
  return created.id;
}

export async function updateDeviceCalendarEvent(nativeEventId: string, patch: Partial<DeviceCalendarEvent>): Promise<void> {
  const event = await Calendar.ExpoCalendarEvent.get(nativeEventId);
  await event.update({
    title: patch.title,
    startDate: patch.startDate,
    endDate: patch.endDate,
    location: patch.location,
    notes: patch.notes,
  });
}

export async function removeDeviceCalendarEvent(nativeEventId: string): Promise<void> {
  const event = await Calendar.ExpoCalendarEvent.get(nativeEventId);
  await event.delete();
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
