// RevenueCat posts subscription lifecycle events here. Auth is the
// "Authorization header" shared-secret method (configured in the RevenueCat
// dashboard under this webhook's settings) — compared against
// REVENUECAT_WEBHOOK_SECRET. Runs as the service role since it's invoked by
// RevenueCat, not a signed-in user.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const PRODUCT_TIER: Record<string, 'starter' | 'growth' | 'pro'> = {
  tru_starter_monthly: 'starter',
  tru_growth_monthly: 'growth',
  tru_pro_monthly: 'pro',
};

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  period_type?: string; // TRIAL | INTRO | NORMAL | PROMOTIONAL | PREPAID
  expiration_at_ms?: number | null;
}

function msToIso(ms: number | null | undefined): string | null {
  return ms != null ? new Date(ms).toISOString() : null;
}

async function upsertSubscription(coachId: string, fields: Record<string, unknown>) {
  const { data: profile } = await supabase.from('profiles').select('programme_id').eq('id', coachId).single();
  if (!profile?.programme_id) {
    console.warn(`No programme found for coach ${coachId} — skipping subscription update`);
    return;
  }

  const { error } = await supabase.from('subscriptions').upsert(
    {
      coach_id: coachId,
      programme_id: profile.programme_id,
      updated_at: new Date().toISOString(),
      ...fields,
    },
    { onConflict: 'coach_id' },
  );
  if (error) console.error('subscriptions upsert failed', error);

  await supabase.from('profiles').update({ revenuecat_customer_id: coachId }).eq('id', coachId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const expectedSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    const authHeader = req.headers.get('Authorization');
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const event: RevenueCatEvent = body.event;
    if (!event?.type || !event?.app_user_id) throw new Error('Malformed webhook payload');

    const coachId = event.app_user_id;
    const tier = event.product_id ? PRODUCT_TIER[event.product_id] : undefined;

    switch (event.type) {
      case 'INITIAL_PURCHASE':
        if (event.period_type === 'TRIAL') {
          // RevenueCat has no distinct "trial started" event — a trial
          // shows up as an INITIAL_PURCHASE with period_type: "TRIAL".
          await upsertSubscription(coachId, {
            tier: tier ?? null,
            status: 'trialing',
            trial_ends_at: msToIso(event.expiration_at_ms),
          });
        } else {
          await upsertSubscription(coachId, {
            tier: tier ?? null,
            status: 'active',
            current_period_ends_at: msToIso(event.expiration_at_ms),
          });
        }
        break;

      case 'RENEWAL':
        await upsertSubscription(coachId, {
          tier: tier ?? null,
          status: 'active',
          current_period_ends_at: msToIso(event.expiration_at_ms),
        });
        break;

      case 'CANCELLATION':
        await upsertSubscription(coachId, { status: 'cancelled' });
        break;

      case 'EXPIRATION':
        await upsertSubscription(coachId, { status: 'expired' });
        break;

      default:
        // Other RevenueCat event types (BILLING_ISSUE, PRODUCT_CHANGE, etc.)
        // aren't part of this app's billing model — acknowledge and ignore.
        break;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
