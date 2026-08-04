import { supabase } from './supabase';
import { Purchases } from './revenuecat';

export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'exempt';

export interface CoachAccess {
  hasAccess: boolean;
  tier: SubscriptionTier | null;
  isTrialing: boolean;
  daysLeft: number | null;
  athleteLimit: number;
}

const TRIAL_DAYS = 30;
const ENTITLEMENT_ID = 'coach_access';

const PRODUCT_TIER: Record<string, SubscriptionTier> = {
  tru_starter_monthly: 'starter',
  tru_growth_monthly: 'growth',
  tru_pro_monthly: 'pro',
};

export function getAthleteLimit(tier: SubscriptionTier | null): number {
  switch (tier) {
    case 'starter':
      return 10;
    case 'growth':
      return 25;
    case 'pro':
    case 'exempt':
      return Infinity;
    default:
      // No tier chosen yet (e.g. mid-trial) — full access during evaluation.
      return Infinity;
  }
}

function daysRemaining(endIso: string): number {
  return Math.max(0, Math.ceil((new Date(endIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/**
 * Resolves what a coach can currently do. Checks, in order: the
 * subscription_exempt flag, the DB subscriptions row (kept current by the
 * revenuecat-webhook edge function — the source of truth for paid tiers),
 * a live RevenueCat entitlement check (covers the gap right after a purchase
 * before the webhook lands), then the 30-day trial window.
 */
export async function getCoachAccess(coachId: string): Promise<CoachAccess> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_exempt, trial_started_at')
    .eq('id', coachId)
    .single();

  if (profile?.subscription_exempt) {
    return { hasAccess: true, tier: 'exempt', isTrialing: false, daysLeft: null, athleteLimit: Infinity };
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, status, trial_ends_at, current_period_ends_at')
    .eq('coach_id', coachId)
    .maybeSingle();

  if (sub?.status === 'active') {
    const tier = (sub.tier as SubscriptionTier) ?? null;
    return { hasAccess: true, tier, isTrialing: false, daysLeft: null, athleteLimit: getAthleteLimit(tier) };
  }

  if (sub?.status === 'trialing' && sub.trial_ends_at) {
    const daysLeft = daysRemaining(sub.trial_ends_at);
    if (daysLeft > 0) {
      return { hasAccess: true, tier: null, isTrialing: true, daysLeft, athleteLimit: Infinity };
    }
  }

  // Purchase may have just happened and the webhook hasn't landed yet —
  // check RevenueCat directly as a fallback. No-ops harmlessly in Expo Go's
  // Preview API Mode (returns no active entitlements).
  try {
    const info = await Purchases.getCustomerInfo();
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    if (entitlement) {
      const tier = PRODUCT_TIER[entitlement.productIdentifier] ?? null;
      return {
        hasAccess: true,
        tier,
        isTrialing: entitlement.periodType === 'TRIAL',
        daysLeft: null,
        athleteLimit: getAthleteLimit(tier),
      };
    }
  } catch {
    // Not configured / offline — fall through to the trial-window check.
  }

  // Last resort: the profile-level trial marker, in case the subscriptions
  // row was never created (e.g. start_trial_if_needed hasn't run yet).
  if (profile?.trial_started_at) {
    const elapsedDays = (Date.now() - new Date(profile.trial_started_at).getTime()) / (1000 * 60 * 60 * 24);
    const daysLeft = Math.ceil(TRIAL_DAYS - elapsedDays);
    if (daysLeft > 0) {
      return { hasAccess: true, tier: null, isTrialing: true, daysLeft, athleteLimit: Infinity };
    }
  }

  return { hasAccess: false, tier: null, isTrialing: false, daysLeft: 0, athleteLimit: 0 };
}

/** Stamps trial_started_at + creates the trialing subscription row, once, on first coach login. */
export async function startTrialIfNeeded(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, programme_id, trial_started_at')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'coach' || profile.trial_started_at || !profile.programme_id) return;

  await supabase.rpc('start_trial_if_needed', { target_programme_id: profile.programme_id });
}
