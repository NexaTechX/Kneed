import { supabase } from '@/lib/supabase';

export const PRIVATE_MEDIA_BUCKET = 'creator-media-private';

/** A stored media value is a public URL (free content) or a private object path (paid/private). */
export function isPublicUrl(value: string | null | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

/**
 * Resolves the displayable URL for a post's stored media value.
 * - Public URLs are returned as-is.
 * - Private object paths are signed on demand. Storage RLS only allows the owner
 *   (or, via the unlock flow, granted users through a signed link) to read them, so
 *   this should only be called for media the viewer is allowed to see.
 */
export async function resolvePostMediaUrl(
  storedValue: string | null | undefined,
  ttlSeconds = 3600,
): Promise<string | null> {
  if (!storedValue) return null;
  if (isPublicUrl(storedValue)) return storedValue;
  const { data, error } = await supabase.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(storedValue, ttlSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
