// AI-generates a week's workout (blocks + exercises) for a coach's event
// group, constrained to the app's known exercise vocabulary and block
// schema so the result always renders/edits correctly in the block builder.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32';
import { corsHeaders } from '../_shared/cors.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

const MODEL = 'claude-sonnet-5';

type EventGroup = 'throws' | 'sprints' | 'jumps';
type BlockType =
  | 'warm_up' | 'olympic_lifts' | 'weightlifting' | 'strength' | 'plyometrics' | 'core_glutes'
  | 'med_ball_mobility' | 'technical_drills' | 'conditioning' | 'speed_work' | 'speed_endurance'
  | 'tempo' | 'jump_reps' | 'cool_down';

interface BlockSpec {
  type: BlockType;
  label: string;
  exercises: string[];
  fields: string[];
}

const WARM_COOL_FIELDS = ['timeSeconds', 'notes'];
const LIFT_FIELDS = ['sets', 'repsPattern', 'pctOfMax', 'restSeconds'];
const PLYO_FIELDS = ['sets', 'repsPattern', 'distanceMetres', 'restSeconds'];
const CORE_FIELDS = ['sets', 'repsPattern', 'timeSeconds'];
const MED_BALL_FIELDS = ['sets', 'repsPattern', 'notes'];
const DRILL_FIELDS = ['sets', 'repsPattern', 'distanceMetres', 'coachingCue'];
const SPEED_FIELDS = ['distanceMetres', 'repsPattern', 'intensityPct', 'restSeconds'];
const JUMP_REPS_FIELDS = ['repsPattern', 'coachingCue', 'notes'];

const OLYMPIC_LIFTS = ['Floor Cleans', 'Hang Cleans', 'Floor Snatch', 'Hang Snatch', 'Clean Hi Pull', 'Snatch Pull', 'Hip Cleans', 'Hip Snatch'];
const WEIGHTLIFTING = [
  'Bench Press', 'Wide Bench', 'Incline Bench', 'Front Press', 'Back Press', 'DB Shoulder Press',
  'Back Squats', 'Front Squats', 'Split Squats', 'Leg Press', 'Leg Extension', 'Leg Curl', 'RDL', 'Deadlift', 'Lunges',
  'Front Squat to Press', 'Squat to Back Press', 'Overhead Squats',
];
const JUMPS_STRENGTH = ['Squats', 'Cleans', 'RDL', 'Nordic Curls', 'SL Squats'];
const CORE_GLUTES = ['Plank', 'Dead Bug', 'Russian Twist', 'Bicycles', 'Fire Hydrants', 'Hip Circles', 'Heel to Ceiling', 'Glute Bridge', 'Reverse Crunch', 'V-Ups', 'Scissors', 'Superman'];
const WARM_UP_GENERAL = ['Jog', 'A-skips', 'B-skips', 'High Knees', 'Butt Kicks', 'Dynamic Stretching'];

// Mirrors src/data/workoutBlocks.ts's EVENT_GROUP_BLOCKS — kept in sync manually since edge
// functions run on Deno and can't import the app's React-facing module directly.
const EVENT_GROUP_BLOCKS: Record<EventGroup, BlockSpec[]> = {
  throws: [
    { type: 'warm_up', label: 'Warm Up', exercises: ['Skipping', ...WARM_UP_GENERAL], fields: WARM_COOL_FIELDS },
    { type: 'olympic_lifts', label: 'Olympic Lifts', exercises: OLYMPIC_LIFTS, fields: LIFT_FIELDS },
    { type: 'weightlifting', label: 'Weightlifting', exercises: WEIGHTLIFTING, fields: LIFT_FIELDS },
    { type: 'plyometrics', label: 'Plyometrics', exercises: ['Explosive Harvards', 'Frog Jumps', 'Hop Hop Jump', 'Speed Skater', 'Split Jumps', 'Tuck Jumps', 'SL Squat Jumps', 'Star Jumps', 'Box Jumps'], fields: PLYO_FIELDS },
    { type: 'core_glutes', label: 'Core & Glutes', exercises: CORE_GLUTES, fields: CORE_FIELDS },
    { type: 'med_ball_mobility', label: 'Med Ball & Mobility', exercises: ['MBM Over Under', 'Upper Twist', 'Reverse Twist', 'Hi/Lo', 'Hurdle Mobility'], fields: MED_BALL_FIELDS },
    { type: 'technical_drills', label: 'Technical Drills & Throws', exercises: ['Ball Throws', 'Stands', 'Step Turns', 'Half Turns', 'Full Turns'], fields: DRILL_FIELDS },
    { type: 'conditioning', label: 'Conditioning', exercises: ['Short Sprints'], fields: SPEED_FIELDS },
    { type: 'cool_down', label: 'Cool Down', exercises: ['Static Stretching'], fields: WARM_COOL_FIELDS },
  ],
  sprints: [
    { type: 'warm_up', label: 'Warm Up', exercises: WARM_UP_GENERAL, fields: WARM_COOL_FIELDS },
    { type: 'technical_drills', label: 'Technical Drills', exercises: ['Wall Drills', 'Wickets', 'Block Starts', 'Bounding', 'Ankling', 'Fast Leg', 'Acceleration Drills'], fields: DRILL_FIELDS },
    { type: 'speed_work', label: 'Speed Work', exercises: ['Max Effort Sprints'], fields: SPEED_FIELDS },
    { type: 'speed_endurance', label: 'Speed Endurance', exercises: ['Speed Endurance Runs'], fields: SPEED_FIELDS },
    { type: 'tempo', label: 'Tempo', exercises: ['Tempo Runs'], fields: SPEED_FIELDS },
    { type: 'strength', label: 'Strength', exercises: [...OLYMPIC_LIFTS, ...WEIGHTLIFTING], fields: LIFT_FIELDS },
    { type: 'core_glutes', label: 'Core', exercises: CORE_GLUTES, fields: CORE_FIELDS },
    { type: 'cool_down', label: 'Cool Down', exercises: ['Static Stretching'], fields: WARM_COOL_FIELDS },
  ],
  jumps: [
    { type: 'warm_up', label: 'Warm Up', exercises: WARM_UP_GENERAL, fields: WARM_COOL_FIELDS },
    { type: 'technical_drills', label: 'Technical Drills', exercises: ['Approach Run Rehearsal', 'Take-off Drills', 'Penultimate Step', 'Pop Drills', 'Step Counting', 'Sand Pit Approach'], fields: DRILL_FIELDS },
    { type: 'plyometrics', label: 'Plyometrics', exercises: ['Bounding', 'Hurdle Hops', 'Box Jumps', 'Depth Jumps', 'SL Hops', 'Triple Jump Bounds', 'Ankle Hops'], fields: PLYO_FIELDS },
    { type: 'jump_reps', label: 'Jump Reps', exercises: ['Competition-Style Attempts'], fields: JUMP_REPS_FIELDS },
    { type: 'strength', label: 'Strength', exercises: JUMPS_STRENGTH, fields: LIFT_FIELDS },
    { type: 'core_glutes', label: 'Core & Glutes', exercises: CORE_GLUTES, fields: CORE_FIELDS },
    { type: 'cool_down', label: 'Cool Down', exercises: ['Static Stretching'], fields: WARM_COOL_FIELDS },
  ],
};

interface RequestBody {
  eventGroup: EventGroup;
  weekNumber: number;
  intensityPct?: number;
  focus?: string;
}

interface GeneratedExercise {
  name: string;
  sets: number | null;
  repsPattern: string | null;
  pctOfMax: number | null;
  distanceMetres: number | null;
  intensityPct: number | null;
  restSeconds: number | null;
  timeSeconds: number | null;
  coachingCue: string | null;
  notes: string | null;
}

interface GeneratedBlock {
  type: BlockType;
  label: string;
  exercises: GeneratedExercise[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

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
      .select('role, programme_id')
      .eq('id', user.id)
      .single();
    if (coachError || !coach) throw new Error('Coach profile not found');
    if (coach.role !== 'coach') throw new Error('Only coaches can generate workouts');

    const body: RequestBody = await req.json();
    const eventGroup = body.eventGroup;
    if (!EVENT_GROUP_BLOCKS[eventGroup]) throw new Error('A valid event group is required');
    const weekNumber = Number(body.weekNumber) || 1;
    const intensityPct = body.intensityPct ?? 0.75;

    const [{ data: config }, { data: recentLogs }] = await Promise.all([
      supabase.from('programme_config').select('*').eq('programme_id', coach.programme_id).maybeSingle(),
      supabase
        .from('weekly_logs')
        .select('week_number, rpe')
        .eq('programme_id', coach.programme_id)
        .order('week_number', { ascending: false })
        .limit(20),
    ]);

    const avgRecentRpe = (() => {
      const vals = (recentLogs ?? []).map((l) => l.rpe).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    })();

    const blockSpecs = EVENT_GROUP_BLOCKS[eventGroup];
    const schemaForPrompt = blockSpecs.map((b) => ({ type: b.type, label: b.label, allowedExercises: b.exercises, fields: b.fields }));

    const configKey = eventGroup === 'throws' ? 'throws_config' : eventGroup === 'sprints' ? 'sprints_config' : 'jumps_config';
    const groupConfig = (config as Record<string, unknown> | null)?.[configKey] ?? null;

    const systemPrompt = `You design a single week's training session structure for a track & field ${eventGroup} programme, as JSON only — no markdown fences, no commentary.

Return a JSON array of blocks, in a sensible training order (warm-up first, cool-down last). Each block:
{ "type": one of the block types below, "label": string, "exercises": [exercise, ...] }
Each exercise:
{ "name": string (MUST be exactly one of that block's allowedExercises — do not invent names),
  "sets": number|null, "repsPattern": string|null (e.g. "5" or "5,3,3,5,3"), "pctOfMax": number|null (0-1, fraction of 1RM, only for lift blocks),
  "distanceMetres": number|null, "intensityPct": number|null (0-1), "restSeconds": number|null, "timeSeconds": number|null,
  "coachingCue": string|null, "notes": string|null }
Only set the fields listed in that block's "fields" — leave every other field null. Use 3-6 exercises per block, and include
every block type given below (skip a block only if it makes no sense for this specific week). This is week ${weekNumber} of
the season at ${Math.round(intensityPct * 100)}% target intensity${body.focus ? ` with this coach-requested focus: "${body.focus}"` : ''}.
${avgRecentRpe != null ? `The squad's average RPE over recent weeks is ${avgRecentRpe.toFixed(1)}/10 — ease volume back if this is already high (7.5+).` : ''}
${groupConfig ? `Programme config for this group: ${JSON.stringify(groupConfig)}.` : ''}

Block schema (type, label, allowedExercises, fields):
${JSON.stringify(schemaForPrompt, null, 2)}

Respond with ONLY the JSON array, nothing else.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate this week\'s session structure now.' }],
    });

    const textBlock = message.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('No response from model');

    let raw: unknown;
    try {
      const jsonText = textBlock.text.trim().replace(/^```(?:json)?\n?/, '').replace(/```$/, '');
      raw = JSON.parse(jsonText);
    } catch {
      throw new Error('Could not parse the generated workout — try again');
    }
    if (!Array.isArray(raw)) throw new Error('Could not parse the generated workout — try again');

    // Validate/clamp against the known schema so a hallucinated block type or exercise
    // name can never reach the client — every block type here must resolve to a spec.
    const specByType = new Map(blockSpecs.map((b) => [b.type, b]));
    const blocks: GeneratedBlock[] = [];
    for (const b of raw) {
      if (typeof b !== 'object' || b === null) continue;
      const spec = specByType.get((b as { type?: string }).type as BlockType);
      if (!spec) continue;
      const exercisesIn = Array.isArray((b as { exercises?: unknown }).exercises) ? (b as { exercises: unknown[] }).exercises : [];
      const allowed = new Set(spec.exercises.map((e) => e.toLowerCase()));
      const exercises: GeneratedExercise[] = exercisesIn
        .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null && typeof (e as { name?: unknown }).name === 'string')
        .filter((e) => allowed.has((e.name as string).toLowerCase()))
        .map((e) => ({
          name: spec.exercises.find((n) => n.toLowerCase() === (e.name as string).toLowerCase())!,
          sets: typeof e.sets === 'number' ? e.sets : null,
          repsPattern: typeof e.repsPattern === 'string' ? e.repsPattern : null,
          pctOfMax: typeof e.pctOfMax === 'number' ? e.pctOfMax : null,
          distanceMetres: typeof e.distanceMetres === 'number' ? e.distanceMetres : null,
          intensityPct: typeof e.intensityPct === 'number' ? e.intensityPct : null,
          restSeconds: typeof e.restSeconds === 'number' ? e.restSeconds : null,
          timeSeconds: typeof e.timeSeconds === 'number' ? e.timeSeconds : null,
          coachingCue: typeof e.coachingCue === 'string' ? e.coachingCue : null,
          notes: typeof e.notes === 'string' ? e.notes : null,
        }));
      if (exercises.length === 0) continue;
      blocks.push({ type: spec.type, label: spec.label, exercises });
    }
    if (blocks.length === 0) throw new Error('The model did not return a usable workout — try again');

    return new Response(JSON.stringify({ blocks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err, 'Could not generate a workout right now. Please try again.') }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
