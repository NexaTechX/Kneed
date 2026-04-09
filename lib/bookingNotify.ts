import { supabase } from '@/lib/supabase';

type BookingNotifyKind =
  | 'provider_confirmed'
  | 'provider_declined'
  | 'provider_completed'
  | 'client_cancelled';

/** Fire-and-forget push to the other party (Edge Function validates JWT + booking access). */
export function notifyBookingPartner(bookingId: string, kind: BookingNotifyKind): void {
  void supabase.functions.invoke('booking-push-notify', { body: { booking_id: bookingId, kind } });
}
