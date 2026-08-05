// Lets a coach send a message to their whole squad (or a chosen subset),
// delivered as both an in-app notification (notifications_log) and a push
// notification. Client-invoked, so unlike send-notifications (which only
// runs from DB triggers/cron and trusts its caller) this validates the
// caller is a coach for the programme before writing anything.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Expo } from 'npm:expo-server-sdk@3';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  message: string;
  /** Omit or empty = whole squad. */
  athleteIds?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await callerClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: coach, error: coachError } = await callerClient
      .from('profiles')
      .select('role, programme_id, full_name')
      .eq('id', user.id)
      .single();
    if (coachError || !coach) throw new Error('Coach profile not found');
    if (coach.role !== 'coach') throw new Error('Only coaches can broadcast');
    if (!coach.programme_id) throw new Error('No programme assigned');

    const body: RequestBody = await req.json();
    const message = body.message?.trim();
    if (!message) throw new Error('Message is required');
    if (message.length > 1000) throw new Error('Message is too long');

    // Bypasses RLS: notifications_log has no client insert policy by design
    // (only edge functions running as service role may insert).
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let targetIds = body.athleteIds?.filter(Boolean) ?? [];
    if (targetIds.length === 0) {
      const { data: squad, error: squadError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('programme_id', coach.programme_id)
        .eq('role', 'athlete');
      if (squadError) throw squadError;
      targetIds = (squad ?? []).map((a) => a.id);
    } else {
      // Never trust client-supplied ids without confirming they're this coach's own athletes.
      const { data: verified, error: verifyError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('programme_id', coach.programme_id)
        .eq('role', 'athlete')
        .in('id', targetIds);
      if (verifyError) throw verifyError;
      targetIds = (verified ?? []).map((a) => a.id);
    }
    if (targetIds.length === 0) throw new Error('No matching athletes to send to');

    const { error: insertError } = await adminClient
      .from('notifications_log')
      .insert(targetIds.map((athleteId) => ({ athlete_id: athleteId, programme_id: coach.programme_id, type: 'broadcast', message })));
    if (insertError) throw insertError;

    const { data: tokenRows } = await adminClient.from('profiles').select('id, expo_push_token').in('id', targetIds);
    const expo = new Expo({ accessToken: Deno.env.get('EXPO_ACCESS_TOKEN') });
    const title = `Message from ${coach.full_name ?? 'your coach'}`;
    const pushMessages = (tokenRows ?? [])
      .filter((r) => r.expo_push_token && Expo.isExpoPushToken(r.expo_push_token))
      .map((r) => ({ to: r.expo_push_token as string, sound: 'default' as const, title, body: message }));
    if (pushMessages.length > 0) {
      try {
        await expo.sendPushNotificationsAsync(pushMessages);
      } catch (err) {
        console.error('Broadcast push send failed', err);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: targetIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
