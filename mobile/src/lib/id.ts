/** Short, collision-safe-enough client-generated id for local array items (exercises, blocks) that
 *  get persisted as part of a jsonb array rather than as their own DB row with a real uuid. */
export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
