// AI Coach Assistant — streams a Claude response grounded in the coach's
// squad data. ANTHROPIC_API_KEY never leaves this function.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32';
import { corsHeaders } from '../_shared/cors.ts';
import { projectToWeek } from '../_shared/projections.ts';

const HAIKU_MODEL = 'claude-haiku-4-5';
const DEEP_ANALYSIS_MODEL = 'claude-sonnet-5';
const COMPETITION_WEEKS_AHEAD = 4;

interface RequestBody {
  coachId?: string;
  message: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  deepAnalysis?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    // Scoped to the caller's JWT so RLS enforces "coach reads own programme".
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: coach, error: coachError } = await supabase
      .from('profiles')
      .select('id, role, programme_id, full_name')
      .eq('id', user.id)
      .single();
    if (coachError || !coach) throw new Error('Coach profile not found');
    if (coach.role !== 'coach') throw new Error('Only coaches can use the AI assistant');

    const body: RequestBody = await req.json();
    if (!body.message) throw new Error('message is required');

    const { data: athletes, error: athletesError } = await supabase
      .from('profiles')
      .select('id, full_name, event, baseline_distance, qualifying_standard, qualifying_event')
      .eq('programme_id', coach.programme_id)
      .eq('role', 'athlete');
    if (athletesError) throw athletesError;

    const { data: allLogs, error: logsError } = await supabase
      .from('weekly_logs')
      .select('athlete_id, week_number, best_throw, rpe')
      .eq('programme_id', coach.programme_id)
      .order('week_number', { ascending: true });
    if (logsError) throw logsError;

    const logsByAthlete = new Map<string, typeof allLogs>();
    for (const log of allLogs ?? []) {
      const list = logsByAthlete.get(log.athlete_id) ?? [];
      list.push(log);
      logsByAthlete.set(log.athlete_id, list);
    }

    const squadContext = (athletes ?? []).map((athlete) => {
      const logs = logsByAthlete.get(athlete.id) ?? [];
      const throws = logs.filter((l) => l.best_throw != null).map((l) => l.best_throw as number);
      const seasonBest = throws.length ? Math.max(...throws) : null;

      const last4Rpe = logs
        .slice(-4)
        .map((l) => l.rpe)
        .filter((v): v is number => v != null);
      const avgRpe = last4Rpe.length ? last4Rpe.reduce((a, b) => a + b, 0) / last4Rpe.length : null;

      const lastWeek = logs.length ? logs[logs.length - 1].week_number : 0;
      const projection = projectToWeek(
        logs.map((l) => ({ week_number: l.week_number, best_throw: l.best_throw })),
        lastWeek + COMPETITION_WEEKS_AHEAD,
      );
      const qualifyingGap =
        projection && athlete.qualifying_standard != null ? projection.projected - athlete.qualifying_standard : null;

      return {
        name: athlete.full_name,
        event: athlete.event,
        seasonBest,
        avgRpeLast4Weeks: avgRpe != null ? Number(avgRpe.toFixed(1)) : null,
        projectedMark: projection ? Number(projection.projected.toFixed(2)) : null,
        projectionConfidence: projection?.confidence ?? null,
        qualifyingStandard: athlete.qualifying_standard,
        qualifyingGap: qualifyingGap != null ? Number(qualifyingGap.toFixed(2)) : null,
      };
    });

    const systemPrompt = `You are the AI assistant for ${coach.full_name}, a track & field throws coach on TRU Performance.
Answer questions about their squad using this current data (JSON). Be concise, direct, and coach-to-coach in tone.
Flag qualifying risk, high RPE, and stalled progress when relevant. Do not invent data not present here.

Squad data:
${JSON.stringify(squadContext, null, 2)}`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const model = body.deepAnalysis ? DEEP_ANALYSIS_MODEL : HAIKU_MODEL;

    const messages: Anthropic.MessageParam[] = [
      ...(body.conversationHistory ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: body.message },
    ];

    const anthropicStream = anthropic.messages.stream({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n[error: ${err instanceof Error ? err.message : 'stream failed'}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
