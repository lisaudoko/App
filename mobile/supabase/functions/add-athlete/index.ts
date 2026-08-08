// Lets a coach create an athlete account directly (no join code needed).
// Creating an auth user requires the service role key, so this must run
// server-side — never exposed to the client.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

interface RequestBody {
  name: string;
  email: string;
  password: string;
  event: string;
  eventGroup: 'throws' | 'sprints' | 'jumps';
  baselineMark?: number;
  qualifyingStandard?: number;
  qualifyingEvent?: string;
  dateOfBirth?: string;
  classCategory?: string;
  sex?: 'male' | 'female';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    // Scoped to the caller's JWT so we can trust who's asking.
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
    if (coach.role !== 'coach') throw new Error('Only coaches can add athletes');
    if (!coach.programme_id) throw new Error('No programme assigned');

    const body: RequestBody = await req.json();
    if (!body.name || !body.email || !body.password) throw new Error('name, email, and password are required');
    if (body.password.length < 6) throw new Error('Password must be at least 6 characters');
    if (!['throws', 'sprints', 'jumps'].includes(body.eventGroup)) throw new Error('A valid event group is required');
    if (body.sex !== undefined && !['male', 'female'].includes(body.sex)) throw new Error('Sex must be male or female');

    // Bypasses RLS to create the auth user + profile — must use service role.
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email.trim(),
      password: body.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      const message = createError?.message.includes('already been registered')
        ? 'An account with that email already exists.'
        : createError?.message ?? 'Could not create the athlete account';
      throw new Error(message);
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: created.user.id,
      programme_id: coach.programme_id,
      role: 'athlete',
      full_name: body.name,
      event: body.event || null,
      event_group: body.eventGroup,
      baseline_distance: body.baselineMark ?? null,
      qualifying_standard: body.qualifyingStandard ?? null,
      qualifying_event: body.qualifyingEvent ?? body.event ?? null,
      date_of_birth: body.dateOfBirth ?? null,
      class_category: body.classCategory ?? null,
      sex: body.sex ?? null,
      // The coach chose this password, not the athlete — force a change on first login.
      must_change_password: true,
    });
    if (profileError) {
      // Roll back the orphaned auth user if the profile insert failed.
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    return new Response(JSON.stringify({ athleteId: created.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err, 'Could not add the athlete. Please try again.') }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
