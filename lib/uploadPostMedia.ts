import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export type UploadedPostMedia = {
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
};

function extFromMime(asset: ImagePicker.ImagePickerAsset): { ext: string; contentType: string } {
  const m = (asset.mimeType ?? '').toLowerCase();
  if (m.includes('video/quicktime')) return { ext: 'mov', contentType: 'video/quicktime' };
  if (m.includes('video')) return { ext: 'mp4', contentType: m || 'video/mp4' };
  if (m.includes('png')) return { ext: 'png', contentType: 'image/png' };
  if (m.includes('webp')) return { ext: 'webp', contentType: 'image/webp' };
  return { ext: 'jpg', contentType: 'image/jpeg' };
}

/**
 * Opens the library to pick an image or video, uploads to `creator-media-public`,
 * and returns public URLs for the post row.
 */
export async function pickAndUploadPostMedia(userId: string): Promise<UploadedPostMedia | null> {
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

  const picked = new File(asset.uri);
  const buffer = await picked.arrayBuffer();

  const { error: upErr } = await supabase.storage.from('creator-media-public').upload(mainPath, buffer, {
    contentType: asset.mimeType ?? contentType,
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from('creator-media-public').getPublicUrl(mainPath);
  const mediaUrl = pub.publicUrl;

  let thumbnailUrl: string | null = null;
  if (isVideo && asset.uri) {
    // Some platforms expose a generated thumbnail URI — upload so feed can show a poster image.
    const thumbLocal = (asset as ImagePicker.ImagePickerAsset & { thumbnailUri?: string }).thumbnailUri;
    if (thumbLocal) {
      try {
        const thumbPath = `${base}-thumb.jpg`;
        const thumbFile = new File(thumbLocal);
        const thumbBuf = await thumbFile.arrayBuffer();
        const { error: tErr } = await supabase.storage.from('creator-media-public').upload(thumbPath, thumbBuf, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (!tErr) {
          const { data: tPub } = supabase.storage.from('creator-media-public').getPublicUrl(thumbPath);
          thumbnailUrl = tPub.publicUrl;
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
  };
}
