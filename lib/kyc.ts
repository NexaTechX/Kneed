import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import type { KycApplication } from '@/types/database';

const KYC_BUCKET = 'kyc-documents';

function imageExt(asset: ImagePicker.ImagePickerAsset): { ext: string; contentType: string } {
  const m = (asset.mimeType ?? '').toLowerCase();
  if (m.includes('png')) return { ext: 'png', contentType: 'image/png' };
  if (m.includes('webp')) return { ext: 'webp', contentType: 'image/webp' };
  return { ext: 'jpg', contentType: 'image/jpeg' };
}

/**
 * Picks an identity image and uploads it to the private `kyc-documents` bucket.
 * Returns the storage object PATH (not a public URL) — documents are never public.
 */
export async function pickAndUploadKycDocument(
  userId: string,
  kind: 'id' | 'selfie',
): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Allow photo library access to attach your document.');
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
  });
  if (res.canceled || !res.assets[0]) return null;

  const asset = res.assets[0];
  const { ext, contentType } = imageExt(asset);
  const path = `${userId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const file = new File(asset.uri);
  const buffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from(KYC_BUCKET).upload(path, buffer, {
    contentType: asset.mimeType ?? contentType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function submitKycApplication(input: {
  userId: string;
  fullLegalName: string;
  dob: string;
  idDocPath: string;
  selfiePath: string | null;
}) {
  const { error } = await supabase.from('kyc_applications').insert({
    user_id: input.userId,
    full_legal_name: input.fullLegalName,
    dob: input.dob,
    id_doc_path: input.idDocPath,
    selfie_path: input.selfiePath,
    status: 'pending',
  });
  if (error) throw error;
}

/** Latest application for the user (any status), or null. */
export async function fetchLatestKycApplication(userId: string): Promise<KycApplication | null> {
  const { data, error } = await supabase
    .from('kyc_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as KycApplication) ?? null;
}

/** Admin/owner signed URL to view a private KYC document. */
export async function signedKycUrl(path: string, ttlSeconds = 120): Promise<string | null> {
  const { data, error } = await supabase.storage.from(KYC_BUCKET).createSignedUrl(path, ttlSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
