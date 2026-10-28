const EPOCH_MONDAY_UTC = Date.UTC(2020, 0, 6);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deterministic Mon–Sun (UTC) calendar-week bucket for a "YYYY-MM-DD" date string. Not an ISO week
 * number — it only needs consistent equality/ordering, and it's what lets "who logged this week?"
 * compare athletes by real dates (an athlete's own week_number is just how many logs they've made).
 */
export function weekBucket(dateStr: string): number {
  return Math.floor((new Date(`${dateStr.slice(0, 10)}T00:00:00Z`).getTime() - EPOCH_MONDAY_UTC) / WEEK_MS);
}

/** The bucket for today (UTC date, the same clock weekly logs are stamped with). */
export function currentWeekBucket(): number {
  return weekBucket(new Date().toISOString().slice(0, 10));
}

/** Monday of a bucket as a short label, e.g. "Aug 4". */
export function weekBucketLabel(bucket: number): string {
  return new Date(EPOCH_MONDAY_UTC + bucket * WEEK_MS).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
