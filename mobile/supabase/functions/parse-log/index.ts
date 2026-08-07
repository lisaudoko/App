// Natural-language weekly-log parser. Step 1: regex. Step 2 (only when regex
// confidence is low): Claude haiku extraction. ANTHROPIC_API_KEY never leaves
// this function.
import Anthropic from 'npm:@anthropic-ai/sdk@0.32';
import { corsHeaders } from '../_shared/cors.ts';
import { friendlyErrorMessage } from '../_shared/friendlyError.ts';

type EventGroup = 'throws' | 'sprints' | 'jumps';

interface RequestBody {
  text: string;
  eventGroup?: EventGroup;
}

interface ParsedResult {
  mark: number | null;
  rpe: number | null;
  notes: string | null;
  confidence: 'high' | 'low';
}

/** "1:48.30" or "48.3" -> seconds. Returns null if not parseable. */
function parseTimeToSeconds(text: string): number | null {
  const colonMatch = text.match(/(\d+):(\d{2}(?:\.\d+)?)/);
  if (colonMatch) return parseInt(colonMatch[1], 10) * 60 + parseFloat(colonMatch[2]);
  const plainMatch = text.match(/(\d+(?:\.\d+)?)/);
  return plainMatch ? parseFloat(plainMatch[1]) : null;
}

function regexParseDistance(text: string): { mark: number | null; rpe: number | null; notes: string | null } {
  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*m\b/i);
  const rpeMatch = text.match(/rpe\s*[:=]?\s*(\d+(?:\.\d+)?)/i);

  let notes = text;
  if (distanceMatch) notes = notes.replace(distanceMatch[0], '');
  if (rpeMatch) notes = notes.replace(rpeMatch[0], '');
  notes = notes.replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    mark: distanceMatch ? parseFloat(distanceMatch[1]) : null,
    rpe: rpeMatch ? parseFloat(rpeMatch[1]) : null,
    notes: notes || null,
  };
}

function regexParseTime(text: string): { mark: number | null; rpe: number | null; notes: string | null } {
  const rpeMatch = text.match(/rpe\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  let stripped = rpeMatch ? text.replace(rpeMatch[0], '') : text;

  // mm:ss(.ss) form, e.g. "1:48.30"
  const clockMatch = stripped.match(/\b\d+:\d{2}(?:\.\d+)?\b/);
  // plain seconds form, e.g. "10.82s", "48.3 seconds", "10.82"
  const secondsMatch = stripped.match(/(\d+(?:\.\d+)?)\s*(?:s\b|sec(?:onds)?\b)/i);
  const bareNumberMatch = stripped.match(/\b\d+(?:\.\d+)?\b/);

  let timeMatch: string | null = null;
  let time: number | null = null;
  if (clockMatch) {
    timeMatch = clockMatch[0];
    time = parseTimeToSeconds(clockMatch[0]);
  } else if (secondsMatch) {
    timeMatch = secondsMatch[0];
    time = parseFloat(secondsMatch[1]);
  } else if (bareNumberMatch) {
    timeMatch = bareNumberMatch[0];
    time = parseFloat(bareNumberMatch[0]);
  }

  let notes = stripped;
  if (timeMatch) notes = notes.replace(timeMatch, '');
  notes = notes.replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    mark: time,
    rpe: rpeMatch ? parseFloat(rpeMatch[1]) : null,
    notes: notes || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    if (!body.text || !body.text.trim()) throw new Error('text is required');
    const eventGroup = body.eventGroup ?? 'throws';
    const isTimed = eventGroup === 'sprints';

    const regexResult = isTimed ? regexParseTime(body.text) : regexParseDistance(body.text);
    const highConfidence = regexResult.mark != null && regexResult.rpe != null;

    if (highConfidence) {
      const result: ParsedResult = { ...regexResult, confidence: 'high' };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metricField = isTimed ? 'time_seconds' : 'distance_metres';
    let aiResult: { rpe: number | null; notes: string | null; [key: string]: number | string | null } = {
      [metricField]: regexResult.mark,
      rpe: regexResult.rpe,
      notes: regexResult.notes,
    };
    // The AI pass only refines an already-usable regex result — if the model call
    // fails (e.g. a provider-side outage), silently keep the regex result rather
    // than failing the whole log entry over a "nice to have" enhancement.
    try {
      const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
      const metricInstruction = isTimed
        ? `${metricField} is the sprint/hurdle time in seconds (convert mm:ss formats like "1:48.3" to total seconds, e.g. 108.3).`
        : `${metricField} is the best throw or jump mark in metres.`;
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        system:
          `Extract a track & field athlete's weekly training log entry from free text. ` +
          `Respond with ONLY a JSON object: {"${metricField}": number|null, "rpe": number|null, "notes": string|null}. ` +
          `${metricInstruction} rpe is rate of perceived exertion, 1-10. ` +
          'notes is any remaining free-text context (how it felt, conditions, etc), or null if none.',
        messages: [{ role: 'user', content: body.text }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // fall back to the regex result already seeded into aiResult above
    }

    const result: ParsedResult = {
      mark: (aiResult[metricField] as number | null) ?? regexResult.mark,
      rpe: aiResult.rpe ?? regexResult.rpe,
      notes: aiResult.notes ?? regexResult.notes,
      confidence: 'low',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: friendlyErrorMessage(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
