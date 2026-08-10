// Lets a head coach invite an assistant coach to their programme. No email
// service is wired up in this app — the client shares the resulting link
// itself (Share/Copy sheet, same pattern as add-athlete's credential share).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

interface RequestBody {
  email: string;
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
      .select('id, role, programme_id')
      .eq('id', user.id)
      .single();
    if (coachError || !coach) throw new Error('Coach profile not found');
    if (coach.role !== 'coach') throw new Error('Only the head coach can invite assistant coaches');
    if (!coach.programme_id) throw new Error('No programme assigned');

    const body: RequestBody = await req.json();
    const email = body.email?.trim().toLowerCase();
    if (!email) throw new Error('email is required');

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Only the programme's owner may invite — role='coach' already implies this in
    // practice (exactly one per programme), but owner_id is the authoritative check.
    const { data: programme, error: programmeError } = await adminClient
      .from('programmes')
      .select('id, owner_id')
      .eq('id', coach.programme_id)
      .single();
    if (programmeError || !programme) throw new Error('Programme not found');
    if (programme.owner_id !== coach.id) throw new Error('Only the head coach can invite assistant coaches');

    const { data: invite, error: inviteError } = await adminClient
      .from('coach_invites')
      .insert({
        programme_id: coach.programme_id,
        invited_by: coach.id,
        email,
        invited_role: 'assistant_coach',
      })
      .select('token')
      .single();
    if (inviteError || !invite) throw inviteError ?? new Error('Could not create invite');

    return new Response(JSON.stringify({ token: invite.token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err, 'Could not send that invite.') }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
