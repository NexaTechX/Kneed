import { supabase } from '@/lib/supabase';

export type DiscoverCreator = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  creator_bio: string | null;
  cover_image_url: string | null;
  private_room_rate_cents: number;
};

/** KYC-verified, in-good-standing creators who have set a Private Room rate. */
export async function fetchDiscoverableCreators(excludeUserId: string): Promise<DiscoverCreator[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, headline, creator_bio, cover_image_url, private_room_rate_cents')
    .eq('is_kyc_verified', true)
    .eq('account_status', 'active')
    .gt('private_room_rate_cents', 0)
    .neq('id', excludeUserId)
    .order('private_room_rate_cents', { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as DiscoverCreator[];
}

export async function fetchCreatorProfile(id: string): Promise<DiscoverCreator | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, headline, creator_bio, cover_image_url, private_room_rate_cents')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as DiscoverCreator) ?? null;
}

export async function createPrivateRoomSession(input: {
  bookedUserId: string;
  bookerUserId: string;
  startsAt: string;
  durationMin: number;
  amountCents: number;
  notes: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from('private_room_sessions')
    .insert({
      booked_user_id: input.bookedUserId,
      booker_user_id: input.bookerUserId,
      starts_at: input.startsAt,
      duration_min: input.durationMin,
      amount_cents: input.amountCents,
      notes: input.notes,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
