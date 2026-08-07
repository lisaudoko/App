// Lets a coach remove an athlete from their own programme. Deleting the auth
// user (which requires the service role) cascades to profiles/weekly_logs/
// strength_logs/notifications_log/athlete_notes/meet_entries/workout_completions.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

interface RequestBody {
  athleteId: string;
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
      .select('role, programme_id')
      .eq('id', user.id)
      .single();
    if (coachError || !coach) throw new Error('Coach profile not found');
    if (coach.role !== 'coach') throw new Error('Only coaches can remove athletes');

    const body: RequestBody = await req.json();
    if (!body.athleteId) throw new Error('athleteId is required');

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Never trust a client-supplied id without confirming it's this coach's own athlete.
    const { data: athlete, error: athleteError } = await adminClient
      .from('profiles')
      .select('id, role, programme_id')
      .eq('id', body.athleteId)
      .single();
    if (athleteError || !athlete) throw new Error('Athlete not found');
    if (athlete.role !== 'athlete' || athlete.programme_id !== coach.programme_id) {
      throw new Error('That athlete is not in your programme');
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(body.athleteId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err, 'Could not remove that athlete.') }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
