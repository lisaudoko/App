/**
 * `supabase.functions.invoke()` throws `FunctionsHttpError` with a
 * hard-coded generic `.message` ("Edge Function returned a non-2xx status
 * code") on any non-2xx response — the edge function's actual `{ error:
 * "..." }` JSON body only lives on `.context`, a `Response` object nothing
 * else in the app reads. Duck-typed rather than importing `FunctionsHttpError`
 * from `@supabase/functions-js` (an undeclared transitive dependency of
 * `@supabase/supabase-js`, not a direct one) so this stays robust to
 * supabase-js internals shifting.
 */
export async function edgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // context wasn't valid JSON — fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : fallback;
}
