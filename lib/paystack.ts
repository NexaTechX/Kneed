import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

export type PaystackInitResult =
  | { ok: true }
  | { ok: false; message: string };

/** Start Paystack hosted checkout for a booking (requires deployed `paystack-initialize` Edge Function). */
export async function openPaystackCheckoutForBooking(bookingId: string): Promise<PaystackInitResult> {
  const { data, error } = await supabase.functions.invoke<{ authorization_url?: string; error?: string }>(
    'paystack-initialize',
    { body: { booking_id: bookingId } },
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
