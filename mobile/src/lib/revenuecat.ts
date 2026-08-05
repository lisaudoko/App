import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

let configured = false;

/**
 * Initializes the RevenueCat SDK once on app start. In Expo Go this
 * automatically falls back to the SDK's Preview API Mode (no native code,
 * no real purchases) — a full EAS dev/production build is required for
 * real billing.
 */
export function initRevenueCat(): void {
  if (configured) return;
  const apiKey = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) return;
  Purchases.configure({ apiKey });
  configured = true;
}

/** Ties the RevenueCat customer to the signed-in Supabase user. */
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logIn(userId);
  } catch {
    // non-fatal — RevenueCat will re-sync identity on next launch
  }
}

/** Detaches RevenueCat from the current user, reverting to an anonymous ID. */
export async function signOutRevenueCat(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // non-fatal — RevenueCat will re-sync identity on next launch
  }
}

export { Purchases };
