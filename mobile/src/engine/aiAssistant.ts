import type { Athlete, Meet, StrengthTest, WeeklyLog } from '@/data/types';
import { detectAnomalies } from './anomalies';
import { estimatePeakTiming } from './peakTiming';
import { projectAtWeek } from './projections';

export interface AiContext {
  athletes: Athlete[];
  weeklyLogs: Record<string, WeeklyLog[]>;
  strengthTests: Record<string, StrengthTest[]>;
  meets: Meet[];
}

function findMentionedAthlete(question: string, athletes: Athlete[]): Athlete | undefined {
  const q = question.toLowerCase();
  return athletes.find((a) => {
    const first = a.name.split(' ')[0].toLowerCase();
    return q.includes(first) || q.includes(a.name.toLowerCase());
  });
}

function qualifyingReport(ctx: AiContext): string {
  const lines: string[] = [];
  const onTrack: string[] = [];
  const borderline: string[] = [];
  const notTracking: string[] = [];

  for (const athlete of ctx.athletes) {
    const logs = ctx.weeklyLogs[athlete.id] ?? [];
    const projection = projectAtWeek(logs, 4);
    const standard = athlete.qualifyingStandard;
    if (!projection) {
      notTracking.push(`${athlete.name} (no data)`);
      continue;
    }
    const gap = projection.mark - standard;
    if (gap >= 0) onTrack.push(`${athlete.name} (proj ${projection.mark.toFixed(1)}m vs ${standard.toFixed(1)}m)`);
    else if (gap >= -0.3) borderline.push(`${athlete.name} (${gap.toFixed(1)}m gap)`);
    else notTracking.push(`${athlete.name} (${gap.toFixed(1)}m gap)`);
  }

  if (onTrack.length) lines.push(`On track: ${onTrack.join(', ')}.`);
  if (borderline.length) lines.push(`Borderline: ${borderline.join(', ')}.`);
  if (notTracking.length) lines.push(`Not currently tracking: ${notTracking.join(', ')}.`);
  return lines.join('\n\n') || 'No qualifying data available yet.';
}

function riskReport(ctx: AiContext): string {
  const flags = ctx.athletes.flatMap((a) =>
    detectAnomalies(a, ctx.weeklyLogs[a.id] ?? [], ctx.strengthTests[a.id] ?? []),
  );
  if (flags.length === 0) return 'No athletes are currently flagged. Squad looks steady this week.';
  return flags.map((f) => `${f.athleteName}: ${f.message}`).join('\n\n');
}

function athleteReport(athlete: Athlete, ctx: AiContext): string {
  const logs = ctx.weeklyLogs[athlete.id] ?? [];
  const tests = ctx.strengthTests[athlete.id] ?? [];
  const peak = estimatePeakTiming(logs);
  const anomalies = detectAnomalies(athlete, logs, tests);
  const lines = [
    `${athlete.name} — ${athlete.event}, season best ${athlete.personalBest}${athlete.unit}.`,
    `Peak timing: ${peak.headline} (${peak.detail.join(', ')}).`,
  ];
  if (anomalies.length) {
    lines.push(...anomalies.map((a) => `Flag: ${a.message}`));
  } else {
    lines.push('No anomalies detected — trending normally.');
  }
  return lines.join('\n\n');
}

/**
 * Local heuristic stand-in for the AI Coach Assistant. Reads the same
 * derived-stats engine every screen uses and answers in plain English.
 * A real deployment would forward `question` + this same context as a
 * prompt to the Claude API; the call site here is the single seam to swap.
 */
export function answerCoachQuestion(question: string, ctx: AiContext): string {
  const q = question.toLowerCase();
  const mentioned = findMentionedAthlete(question, ctx.athletes);

  if (mentioned) return athleteReport(mentioned, ctx);
  if (/qualif|on track|champs|standard/.test(q)) return qualifyingReport(ctx);
  if (/risk|pull back|overtrain|volume|fatigue|deload/.test(q)) return riskReport(ctx);
  if (/morning|brief|good|hi|hello|squad/.test(q)) {
    const flags = ctx.athletes.flatMap((a) =>
      detectAnomalies(a, ctx.weeklyLogs[a.id] ?? [], ctx.strengthTests[a.id] ?? []),
    );
    return flags.length
      ? `Good morning, Coach. ${flags.length} athlete${flags.length > 1 ? 's need' : ' needs'} attention — ${flags
          .slice(0, 3)
          .map((f) => f.athleteName)
          .join(', ')}.`
      : 'Good morning, Coach. Squad is steady — nothing urgent flagged this week.';
  }

  return "I can answer questions about qualifying status, risk/overtraining, or a specific athlete by name — try asking about one of those.";
}
