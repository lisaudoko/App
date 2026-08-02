export interface ParsedEntry {
  mark: number | null;
  rpe: number | null;
}

/**
 * Lightweight natural-language parser for weekly result entries, e.g.
 * "threw 16.1m, RPE 7, felt strong" -> { mark: 16.1, rpe: 7 }.
 */
export function parseNaturalLanguageEntry(text: string): ParsedEntry {
  const markMatch = text.match(/(\d+(?:\.\d+)?)\s*m\b/i);
  const rpeMatch = text.match(/rpe\s*[:=]?\s*(\d+(?:\.\d+)?)/i);

  return {
    mark: markMatch ? parseFloat(markMatch[1]) : null,
    rpe: rpeMatch ? parseFloat(rpeMatch[1]) : null,
  };
}
