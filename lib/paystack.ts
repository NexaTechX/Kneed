import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

export type PaystackInitResult =
  | { ok: true }
  | { ok: false; message: string };

async function openCheckout(body: Record<string, unknown>): Promise<PaystackInitResult> {
  const { data, error } = await supabase.functions.invoke<{ authorization_url?: string; error?: string }>(
    'paystack-initialize',
    { body },
  );

  if (error) {
    return { ok: false, message: error.message };
  }
  if (data && 'error' in data && typeof data.error === 'string') {
    return { ok: false, message: data.error };
  }

  const url = data?.authorization_url;
  if (!url) {
    return { ok: false, message: 'No checkout URL (is the Edge Function deployed?)' };
  }

  const returnUrl = Linking.createURL('/');
  const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
  if (result.type === 'success') {
    return { ok: true };
  }
  if (result.type === 'cancel') {
    return { ok: false, message: 'Checkout closed' };
  }
  return { ok: false, message: 'Could not complete checkout' };
}

/** Pay-to-unlock a feed post (40% platform fee applied on server webhook). */
export async function openPaystackCheckoutForPpv(postId: string): Promise<PaystackInitResult> {
  return openCheckout({ kind: 'ppv', post_id: postId });
}

/** Pay for a private room session (10% platform fee on webhook). */
export async function openPaystackCheckoutForPrivateRoom(sessionId: string): Promise<PaystackInitResult> {
  return openCheckout({ kind: 'private_room', session_id: sessionId });
}
