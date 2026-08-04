import { supabase } from './supabase';

export interface ParsedLogResult {
  distance: number | null;
  rpe: number | null;
  notes: string | null;
  confidence: 'high' | 'low';
}

export async function parseLogText(text: string): Promise<ParsedLogResult> {
  const { data, error } = await supabase.functions.invoke<ParsedLogResult>('parse-log', { body: { text } });
  if (error || !data) throw error ?? new Error('Could not parse that entry');
  return data;
}
