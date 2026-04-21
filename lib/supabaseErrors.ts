/** PostgREST / Supabase errors are often plain objects, not `Error` instances. */
export function formatSupabaseError(e: unknown): string {
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [
      o.message != null ? String(o.message) : '',
      o.details != null ? String(o.details) : '',
      o.hint != null ? String(o.hint) : '',
      o.code != null ? `(code ${String(o.code)})` : '',
    ].filter((s) => s.length > 0);
    if (parts.length) return parts.join(' — ');
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}
