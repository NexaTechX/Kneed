import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('fetchProfile', error.message);
    return null;
  }
  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url' | 'role' | 'onboarding_complete'>>,
) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
  if (error) throw error;
  return data as Profile;
}

export async function upsertProviderRow(
  userId: string,
  patch: Partial<{
    license_number: string;
    license_image: string | null;
    years_exp: number;
    bio: string | null;
    studio_address: string | null;
    travel_radius_miles: number;
    lat: number | null;
    lng: number | null;
  }>,
) {
  const { data, error } = await supabase
    .from('providers')
    .upsert({ id: userId, ...patch })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setRole(userId: string, role: UserRole) {
  return updateProfile(userId, { role });
}
