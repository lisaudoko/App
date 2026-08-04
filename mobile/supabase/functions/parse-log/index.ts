// Natural-language weekly-log parser. Step 1: regex. Step 2 (only when regex
// confidence is low): Claude haiku extraction. ANTHROPIC_API_KEY never leaves
// this function.
import Anthropic from 'npm:@anthropic-ai/sdk@0.32';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  text: string;
}

interface ParsedResult {
  distance: number | null;
  rpe: number | null;
  notes: string | null;
  confidence: 'high' | 'low';
}

function regexParse(text: string): { distance: number | null; rpe: number | null; notes: string | null } {
  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*m\b/i);
  const rpeMatch = text.match(/rpe\s*[:=]?\s*(\d+(?:\.\d+)?)/i);

  let notes = text;
  if (distanceMatch) notes = notes.replace(distanceMatch[0], '');
  if (rpeMatch) notes = notes.replace(rpeMatch[0], '');
  notes = notes.replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    distance: distanceMatch ? parseFloat(distanceMatch[1]) : null,
    rpe: rpeMatch ? parseFloat(rpeMatch[1]) : null,
    notes: notes || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    if (!body.text || !body.text.trim()) throw new Error('text is required');

    const regexResult = regexParse(body.text);
    const highConfidence = regexResult.distance != null && regexResult.rpe != null;

    if (highConfidence) {
      const result: ParsedResult = { ...regexResult, confidence: 'high' };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system:
        'Extract a thrower\'s weekly training log entry from free text. ' +
        'Respond with ONLY a JSON object: {"distance_metres": number|null, "rpe": number|null, "notes": string|null}. ' +
        'distance_metres is the best throw distance in metres. rpe is rate of perceived exertion, 1-10. ' +
        'notes is any remaining free-text context (how it felt, conditions, etc), or null if none.',
      messages: [{ role: 'user', content: body.text }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    let aiResult: { distance_metres: number | null; rpe: number | null; notes: string | null } = {
      distance_metres: regexResult.distance,
      rpe: regexResult.rpe,
      notes: regexResult.notes,
    };
    if (textBlock && textBlock.type === 'text') {
      try {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiResult = JSON.parse(jsonMatch[0]);
      } catch {
        // fall back to regex result below
      }
    }

    const result: ParsedResult = {
      distance: aiResult.distance_metres ?? regexResult.distance,
      rpe: aiResult.rpe ?? regexResult.rpe,
      notes: aiResult.notes ?? regexResult.notes,
      confidence: 'low',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
