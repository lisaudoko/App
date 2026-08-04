import { supabase } from './supabase';
import type { EventGroup } from './formatPerformance';

export interface ParsedLogResult {
  mark: number | null;
  rpe: number | null;
  notes: string | null;
  confidence: 'high' | 'low';
}

export async function parseLogText(text: string, eventGroup: EventGroup): Promise<ParsedLogResult> {
  const { data, error } = await supabase.functions.invoke<ParsedLogResult>('parse-log', { body: { text, eventGroup } });
  if (error || !data) throw error ?? new Error('Could not parse that entry');
  return data;
}
