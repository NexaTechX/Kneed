import { supabase } from '@/lib/supabase';

export async function ensureWalletAccount(userId: string, ownerType: 'user' | 'creator' | 'platform' = 'user') {
  const { error } = await supabase.from('wallet_accounts').upsert({
    owner_id: userId,
    owner_type: ownerType,
  });
  if (error) throw error;
}

export function toNaira(cents: number) {
  return `NGN ${(Math.max(0, cents) / 100).toFixed(2)}`;
}
