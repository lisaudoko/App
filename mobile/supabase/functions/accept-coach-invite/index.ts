// Turns a pending coach_invites row into a real assistant_coach account.
// Always creates a brand-new auth user + a fresh profiles INSERT — never an
// UPDATE to an existing profile's role/programme_id, since
// profiles_prevent_role_programme_change (20260101000021) unconditionally
// blocks that for every caller, including this function's own service role.
// No caller auth required — the invitee has no account yet; the token itself
// is the credential.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

interface RequestBody {
  token: string;
  name: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    if (!body.token || !body.name || !body.password) throw new Error('token, name, and password are required');
    if (body.password.length < 6) throw new Error('Password must be at least 6 characters');

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: invite, error: inviteError } = await adminClient
      .from('coach_invites')
      .select('id, programme_id, email, invited_role, status')
      .eq('token', body.token)
      .single();
    if (inviteError || !invite) throw new Error('This invite link is invalid.');
    if (invite.status !== 'pending') throw new Error('This invite has already been used or was revoked.');
    if (invite.invited_role !== 'assistant_coach') throw new Error('This invite type is not supported here.');

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: invite.email,
      password: body.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      const message = createError?.message.includes('already been registered')
        ? 'An account with that email already exists. Log in instead.'
        : createError?.message ?? 'Could not create your account.';
      throw new Error(message);
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: created.user.id,
      programme_id: invite.programme_id,
      role: 'assistant_coach',
      full_name: body.name,
    });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    const { error: consumeError } = await adminClient
      .from('coach_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: created.user.id })
      .eq('id', invite.id)
      .eq('status', 'pending');
    if (consumeError) throw consumeError;

    return new Response(JSON.stringify({ email: invite.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err, 'Could not accept that invite.') }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
