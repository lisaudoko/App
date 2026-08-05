import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission, fetches an Expo push token, and stores it on the
 * signed-in athlete/coach's profile row so send-notifications can target them.
 * Safe to call repeatedly (e.g. on every login) — it's a no-op on failure.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators/emulators don't have push tokens

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = data;

    const { error } = await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);
    if (error) throw error;

    return token;
  } catch {
    return null;
  }
}

export async function clearPushToken(userId: string): Promise<void> {
  await supabase.from('profiles').update({ expo_push_token: null }).eq('id', userId).then(
    () => {},
    () => {},
  );
}
