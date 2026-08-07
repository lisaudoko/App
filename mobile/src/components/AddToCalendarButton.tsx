import React, { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import {
  addEventToDeviceCalendar,
  deleteDeviceCalendarEventId,
  getCalendarPermissionStatus,
  getDeviceCalendarEventId,
  removeDeviceCalendarEvent,
  requestCalendarPermission,
  setDeviceCalendarEventId,
} from '@/lib/deviceCalendar';
import { Button } from './Button';

interface Props {
  /** meetId, or a `${workoutId}:${weekNumber}:${day}` composite for a training day — stable
   *  across app opens so the local id-mapping store can find this event again. */
  appKey: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
}

type State = 'checking' | 'not-added' | 'added' | 'confirm-remove' | 'permission-denied';

export function AddToCalendarButton({ appKey, title, startDate, endDate, location, notes }: Props) {
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);
  const { colors } = useAppTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [existingId, permission] = await Promise.all([getDeviceCalendarEventId(appKey), getCalendarPermissionStatus()]);
      if (cancelled) return;
      if (existingId) setState('added');
      else if (permission === 'denied') setState('permission-denied');
      else setState('not-added');
    })();
    return () => {
      cancelled = true;
    };
  }, [appKey]);

  async function handleAdd() {
    setBusy(true);
    try {
      const status = await requestCalendarPermission();
      if (status !== 'granted') {
        setState('permission-denied');
        return;
      }
      const nativeId = await addEventToDeviceCalendar({ title, startDate, endDate, location, notes });
      await setDeviceCalendarEventId(appKey, nativeId);
      setState('added');
    } catch {
      // Leave state as-is — the button just stays actionable for a retry.
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const nativeId = await getDeviceCalendarEventId(appKey);
      if (nativeId) await removeDeviceCalendarEvent(nativeId);
      await deleteDeviceCalendarEventId(appKey);
      setState('not-added');
    } catch {
      // Leave state as-is.
    } finally {
      setBusy(false);
    }
  }

  if (state === 'checking') return null;

  if (state === 'permission-denied') {
    return (
      <View>
        <Button label="Allow calendar access in Settings" variant="outline" onPress={() => Linking.openSettings()} />
      </View>
    );
  }

  if (state === 'not-added') {
    return <Button label="Add to Calendar" variant="outline" onPress={handleAdd} loading={busy} />;
  }

  // 'added' or 'confirm-remove' — same "tap again" confirm pattern used elsewhere (NotesScreen's delete).
  return (
    <View>
      <Button
        label={state === 'confirm-remove' ? 'Remove from calendar?' : 'Added ✓'}
        variant="muted"
        loading={busy}
        onPress={() => {
          if (state === 'confirm-remove') {
            handleRemove();
          } else {
            setState('confirm-remove');
            setTimeout(() => setState((s) => (s === 'confirm-remove' ? 'added' : s)), 3000);
          }
        }}
      />
      {state === 'confirm-remove' && (
        <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 2, textAlign: 'center' }}>Tap again to remove</Text>
      )}
    </View>
  );
}
