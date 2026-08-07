/**
 * Provider SDKs (Anthropic, etc.) stringify errors as "<status> {json}" — e.g.
 * `400 {"type":"error","error":{"type":"invalid_request_error","message":"Your
 * credit balance is too low..."}}`. Never let that raw JSON reach the client.
 * Our own thrown `Error`s are already short, human-readable sentences with no
 * embedded JSON, so they pass through unchanged.
 */
export function friendlyErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
  const jsonStart = raw.indexOf('{');
  if (jsonStart === -1) return raw;
  try {
    const parsed = JSON.parse(raw.slice(jsonStart));
    const nested = parsed?.error?.message ?? parsed?.message;
    if (typeof nested === 'string' && /credit balance/i.test(nested)) {
      return 'This feature is temporarily unavailable. Please try again later.';
    }
  } catch {
    // Not JSON — fall through to the generic fallback below.
  }
  return fallback;
}
