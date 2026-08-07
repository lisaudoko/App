// Lets an athlete explicitly submit a completed week's workout to their
// coach. Per-exercise "done" toggles are written directly by the client
// (athletes have RLS insert/update rights on their own workout_completions
// row) — this function only handles the notification, since
// notifications_log has no client insert policy by design.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Expo } from 'npm:expo-server-sdk@3';
import { corsHeaders } from '../_shared/cors.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

interface RequestBody {
  weekNumber: number;
  completedExerciseIds?: string[];
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

    const { data: athlete, error: athleteError } = await callerClient
      .from('profiles')
      .select('id, role, programme_id, full_name')
      .eq('id', user.id)
      .single();
    if (athleteError || !athlete) throw new Error('Profile not found');
    if (athlete.role !== 'athlete') throw new Error('Only athletes can submit a workout');
    if (!athlete.programme_id) throw new Error('No programme assigned');

    const body: RequestBody = await req.json();
    const weekNumber = Number(body.weekNumber);
    if (!Number.isFinite(weekNumber) || weekNumber < 1) throw new Error('A valid week number is required');

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { error: upsertError } = await adminClient.from('workout_completions').upsert(
      {
        athlete_id: athlete.id,
        programme_id: athlete.programme_id,
        week_number: weekNumber,
        completed_exercise_ids: body.completedExerciseIds ?? [],
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id,week_number' },
    );
    if (upsertError) throw upsertError;

    const { data: coach } = await adminClient
      .from('profiles')
      .select('id, expo_push_token')
      .eq('programme_id', athlete.programme_id)
      .eq('role', 'coach')
      .maybeSingle();

    const message = `${athlete.full_name ?? 'An athlete'} completed their Week ${weekNumber} workout.`;
    const { error: insertError } = await adminClient.from('notifications_log').insert({
      athlete_id: athlete.id,
      programme_id: athlete.programme_id,
      type: 'workout_complete',
      message,
    });
    if (insertError) throw insertError;

    if (coach?.expo_push_token && Expo.isExpoPushToken(coach.expo_push_token)) {
      const expo = new Expo({ accessToken: Deno.env.get('EXPO_ACCESS_TOKEN') });
      try {
        await expo.sendPushNotificationsAsync([
          { to: coach.expo_push_token, sound: 'default', title: 'Workout completed', body: message },
        ]);
      } catch (err) {
        console.error('Workout-complete push send failed', err);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err, 'Could not submit your workout. Please try again.') }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
