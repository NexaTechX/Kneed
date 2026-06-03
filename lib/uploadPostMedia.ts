import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export type UploadedPostMedia = {
  /** Public URL for free content, or a private object path for paid/private content. */
  media_url: string;
  media_type: 'image' | 'video';
  /** Always a public URL (teaser) or null — safe to show to locked viewers. */
  thumbnail_url: string | null;
  /** Local file URI for immediate in-composer preview (not persisted). */
  preview_uri: string;
  /** True when media_url is a private object path rather than a public URL. */
  is_private: boolean;
};

const PUBLIC_BUCKET = 'creator-media-public';
const PRIVATE_BUCKET = 'creator-media-private';

function extFromMime(asset: ImagePicker.ImagePickerAsset): { ext: string; contentType: string } {
  const m = (asset.mimeType ?? '').toLowerCase();
  if (m.includes('video/quicktime')) return { ext: 'mov', contentType: 'video/quicktime' };
  if (m.includes('video')) return { ext: 'mp4', contentType: m || 'video/mp4' };
  if (m.includes('png')) return { ext: 'png', contentType: 'image/png' };
  if (m.includes('webp')) return { ext: 'webp', contentType: 'image/webp' };
  return { ext: 'jpg', contentType: 'image/jpeg' };
}

/**
 * Opens the library to pick an image or video and uploads it.
 *
 * Paid/private posts ({ private: true }) go to the private bucket and the returned
 * `media_url` is an object PATH (resolved to a signed URL only for allowed viewers).
 * Free public posts go to the public bucket and `media_url` is a public URL.
 *
 * Video thumbnails are always uploaded to the PUBLIC bucket so a teaser poster can be
 * shown to locked viewers without exposing the protected media itself.
 */
export async function pickAndUploadPostMedia(
  userId: string,
  opts?: { private?: boolean },
): Promise<UploadedPostMedia | null> {
  const isPrivate = opts?.private === true;
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Allow photo library access to attach media.');
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.85,
    videoMaxDuration: 180,
  });

  if (res.canceled || !res.assets[0]) return null;

  const asset = res.assets[0];
  const isVideo = asset.type === 'video';
  const { ext, contentType } = extFromMime(asset);
  const base = `${userId}/posts/${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const mainPath = `${base}.${ext}`;
  const mainBucket = isPrivate ? PRIVATE_BUCKET : PUBLIC_BUCKET;

  const picked = new File(asset.uri);
  const buffer = await picked.arrayBuffer();

  const { error: upErr } = await supabase.storage.from(mainBucket).upload(mainPath, buffer, {
    contentType: asset.mimeType ?? contentType,
    upsert: false,
  });
  if (upErr) throw upErr;

  // Private media is referenced by path; public media by its public URL.
  const mediaUrl = isPrivate ? mainPath : supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(mainPath).data.publicUrl;

  let thumbnailUrl: string | null = null;
  if (isVideo && asset.uri) {
    // Teaser poster — always public so locked viewers can see it.
    const thumbLocal = (asset as ImagePicker.ImagePickerAsset & { thumbnailUri?: string }).thumbnailUri;
    if (thumbLocal) {
      try {
        const thumbPath = `${base}-thumb.jpg`;
        const thumbFile = new File(thumbLocal);
        const thumbBuf = await thumbFile.arrayBuffer();
        const { error: tErr } = await supabase.storage.from(PUBLIC_BUCKET).upload(thumbPath, thumbBuf, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (!tErr) {
          thumbnailUrl = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(thumbPath).data.publicUrl;
        }
      } catch {
        // optional thumbnail
      }
    }
  }

  return {
    media_url: mediaUrl,
    media_type: isVideo ? 'video' : 'image',
    thumbnail_url: thumbnailUrl,
    preview_uri: asset.uri,
    is_private: isPrivate,
  };
}
