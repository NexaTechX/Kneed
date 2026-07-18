import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';

/** Public-safe profile columns (excludes email — private; use auth session). */
const PROFILE_SELECT =
  'id, role, full_name, avatar_url, phone, onboarding_complete, is_age_verified, accepted_content_policy_at, account_status, is_kyc_verified, kyc_verified_at, gender, headline, creator_bio, cover_image_url, private_room_lat, private_room_lng, private_room_rate_cents, private_room_location_updated_at, payout_bank_name, payout_account_number, payout_account_name, created_at';

export async function fetchProfile(userId: string, emailFallback = ''): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('fetchProfile', error.message);
    return null;
  }
  if (!data) return null;
  return { ...(data as Omit<Profile, 'email'>), email: emailFallback };
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | 'full_name'
      | 'phone'
      | 'avatar_url'
      | 'role'
      | 'onboarding_complete'
      | 'headline'
      | 'creator_bio'
      | 'payout_bank_name'
      | 'payout_account_number'
      | 'payout_account_name'
    >
  >,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single();
  if (error) throw error;
  return { ...(data as Omit<Profile, 'email'>), email: '' } as Profile;
}

export async function setRole(userId: string, role: UserRole) {
  return updateProfile(userId, { role });
}

/**
 * Records 18+ affirmation + content-policy acceptance for the current user.
 * The timestamp is set server-side (see the record_age_and_policy_consent migration)
 * so consent cannot be backdated by the client.
 */
export async function recordAgeAndPolicyConsent() {
  const { error } = await supabase.rpc('record_age_and_policy_consent');
  if (error) throw error;
}
