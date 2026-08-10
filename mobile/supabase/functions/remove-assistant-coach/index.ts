// Lets the head coach revoke an assistant coach's access. Fully deletes their
// auth account (cascades to profiles etc.) rather than nulling role/programme_id
// — profiles_prevent_role_programme_change (20260101000021) unconditionally
// blocks changing those on an existing row for every caller, so a soft
// removal isn't possible; this mirrors remove-athlete exactly.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

interface RequestBody {
  assistantCoachId: string;
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
    if (coach.role !== 'coach') throw new Error('Only the head coach can remove assistant coaches');

    const body: RequestBody = await req.json();
    if (!body.assistantCoachId) throw new Error('assistantCoachId is required');

    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: programme, error: programmeError } = await adminClient
      .from('programmes')
      .select('owner_id')
      .eq('id', coach.programme_id)
      .single();
    if (programmeError || !programme || programme.owner_id !== coach.id) {
      throw new Error('Only the head coach can remove assistant coaches');
    }

    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('id, role, programme_id')
      .eq('id', body.assistantCoachId)
      .single();
    if (targetError || !target) throw new Error('Assistant coach not found');
    if (target.role !== 'assistant_coach' || target.programme_id !== coach.programme_id) {
      throw new Error('That person is not an assistant coach in your programme');
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(body.assistantCoachId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err, 'Could not remove that assistant coach.') }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
