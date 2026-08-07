// AI Coach Assistant — streams a Claude response grounded in the coach's
// squad data. ANTHROPIC_API_KEY never leaves this function.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32';
import { corsHeaders } from '../_shared/cors.ts';
import { projectToWeek, computeGap, type Direction } from '../_shared/projections.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

const HAIKU_MODEL = 'claude-haiku-4-5';
const DEEP_ANALYSIS_MODEL = 'claude-sonnet-5';
const COMPETITION_WEEKS_AHEAD = 4;

const EVENT_GROUP_DIRECTION: Record<string, Direction> = {
  throws: 'higher_better',
  jumps: 'higher_better',
  sprints: 'lower_better',
};

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

    const [{ data: athletes, error: athletesError }, { data: programme }, { data: config }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, event, event_group, baseline_distance, qualifying_standard, qualifying_event')
        .eq('programme_id', coach.programme_id)
        .eq('role', 'athlete'),
      supabase.from('programmes').select('event_groups').eq('id', coach.programme_id).single(),
      supabase.from('programme_config').select('*').eq('programme_id', coach.programme_id).maybeSingle(),
    ]);
    if (athletesError) throw athletesError;

    const { data: allLogs, error: logsError } = await supabase
      .from('weekly_logs')
      .select('athlete_id, week_number, best_performance, rpe')
      .eq('programme_id', coach.programme_id)
      .order('week_number', { ascending: true });
    if (logsError) throw logsError;

    const logsByAthlete = new Map<string, typeof allLogs>();
    for (const log of allLogs ?? []) {
      const list = logsByAthlete.get(log.athlete_id) ?? [];
      list.push(log);
      logsByAthlete.set(log.athlete_id, list);
    }

    const { data: allMeetEntries } = await supabase
      .from('meet_entries')
      .select('athlete_id, event, final_mark, place, qualified, meet_id, meets(name, date)')
      .eq('programme_id', coach.programme_id)
      .order('created_at', { ascending: false });

    const meetEntriesByAthlete = new Map<string, typeof allMeetEntries>();
    for (const entry of allMeetEntries ?? []) {
      const list = meetEntriesByAthlete.get(entry.athlete_id) ?? [];
      if (list.length < 5) list.push(entry);
      meetEntriesByAthlete.set(entry.athlete_id, list);
    }

    const { data: allFlaggedNotes } = await supabase
      .from('athlete_notes')
      .select('athlete_id, note_date, note_type, body')
      .eq('programme_id', coach.programme_id)
      .eq('flag_followup', true)
      .order('note_date', { ascending: false });

    const flaggedNotesByAthlete = new Map<string, typeof allFlaggedNotes>();
    for (const note of allFlaggedNotes ?? []) {
      const list = flaggedNotesByAthlete.get(note.athlete_id) ?? [];
      if (list.length < 5) list.push(note);
      flaggedNotesByAthlete.set(note.athlete_id, list);
    }

    const squadContext = (athletes ?? []).map((athlete) => {
      const eventGroup = athlete.event_group ?? 'throws';
      const direction = EVENT_GROUP_DIRECTION[eventGroup] ?? 'higher_better';
      const metricLabel = eventGroup === 'sprints' ? 'best time (s)' : 'best distance (m)';

      const logs = logsByAthlete.get(athlete.id) ?? [];
      const performances = logs.filter((l) => l.best_performance != null).map((l) => l.best_performance as number);
      const seasonBest = performances.length
        ? direction === 'higher_better'
          ? Math.max(...performances)
          : Math.min(...performances)
        : null;

      const last4Rpe = logs
        .slice(-4)
        .map((l) => l.rpe)
        .filter((v): v is number => v != null);
      const avgRpe = last4Rpe.length ? last4Rpe.reduce((a, b) => a + b, 0) / last4Rpe.length : null;

      const lastWeek = logs.length ? logs[logs.length - 1].week_number : 0;
      const projection = projectToWeek(
        logs.map((l) => ({ week_number: l.week_number, performance: l.best_performance })),
        lastWeek + COMPETITION_WEEKS_AHEAD,
        direction,
      );
      const qualifyingGap =
        projection && athlete.qualifying_standard != null
          ? computeGap(projection.projected, athlete.qualifying_standard, direction)
          : null;

      const recentMeets = (meetEntriesByAthlete.get(athlete.id) ?? []).map((e) => {
        const meet = e.meets as unknown as { name: string; date: string } | null;
        return {
          meetName: meet?.name ?? 'Unknown meet',
          date: meet?.date ?? null,
          event: e.event,
          mark: e.final_mark,
          place: e.place,
          qualified: e.qualified,
        };
      });

      const flaggedNotes = (flaggedNotesByAthlete.get(athlete.id) ?? []).map((n) => ({
        date: n.note_date,
        type: n.note_type,
        body: n.body,
      }));

      return {
        name: athlete.full_name,
        event: athlete.event,
        eventGroup,
        metricLabel,
        seasonBest,
        avgRpeLast4Weeks: avgRpe != null ? Number(avgRpe.toFixed(1)) : null,
        projectedPerformance: projection ? Number(projection.projected.toFixed(2)) : null,
        projectionConfidence: projection?.confidence ?? null,
        qualifyingStandard: athlete.qualifying_standard,
        // Positive = still needs to close this much of a gap; negative = already ahead of standard.
        qualifyingGap: qualifyingGap != null ? Number(qualifyingGap.toFixed(2)) : null,
        // Up to 5 most recent competition results, most recent first.
        recentMeets,
        // Up to 5 most recent coaching-diary notes flagged for follow-up, most recent first.
        flaggedNotes,
      };
    });

    const eventGroups: string[] = (programme?.event_groups as string[] | null) ?? ['throws'];
    const configSummary: Record<string, unknown> = {};
    if (eventGroups.includes('throws') && config?.throws_config) configSummary.throws = config.throws_config;
    if (eventGroups.includes('sprints') && config?.sprints_config) configSummary.sprints = config.sprints_config;
    if (eventGroups.includes('jumps') && config?.jumps_config) configSummary.jumps = config.jumps_config;

    const systemPrompt = `You are the AI assistant for ${coach.full_name}, a track & field coach on TRU Performance.
This programme covers: ${eventGroups.join(', ')}. Programme config (pace zones, tracked lifts, etc): ${JSON.stringify(configSummary)}.

Answer questions about their squad using the current data (JSON) below. Be concise, direct, and coach-to-coach in tone.
Each athlete has an eventGroup ('throws', 'sprints', or 'jumps') and a metricLabel telling you what their performance
numbers mean — sprints are times in seconds (lower is better), throws/jumps are distances or heights in metres
(higher is better). Always phrase performance and qualifying-gap language correctly for the athlete's event group:
for sprints say things like "needs to drop 0.3s"; for throws/jumps say "needs to gain 0.4m". A positive qualifyingGap
always means the athlete still needs to close that much of a gap, regardless of event group — never state it backwards.
Flag qualifying risk, high RPE, and stalled progress when relevant. Each athlete also has recentMeets — their up to 5
most recent competition results (meet name, date, event, mark, place, qualified). Reference these when asked about
competition performance, qualifying progress, or how someone did at a specific meet. Each athlete also has
flaggedNotes — up to 5 of the coach's own coaching-diary entries for that athlete that were flagged for follow-up
(date, type: general/injury/technical/mindset/admin, and body text). Surface these when the coach asks about an
athlete's status, history, or follow-ups, especially injury or mindset notes. Do not invent data not present here.

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
          controller.enqueue(encoder.encode(`\n\n${friendlyErrorMessage(err, "Sorry, I couldn't finish that response. Please try again.")}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
