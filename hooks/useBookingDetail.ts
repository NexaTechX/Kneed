import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queries';
import type { Booking } from '@/types/database';
import type { BookingRow } from '@/components/booking/BookingCard';

async function fetchBookingRow(id: string): Promise<BookingRow> {
  const { data: b, error } = await supabase
    .from('bookings')
    .select('*, services (type, duration_min)')
    .eq('id', id)
    .single();
  if (error) throw error;
  const row = b as Booking;

  const { data: provRow, error: pErr } = await supabase
    .from('providers')
    .select('profiles(full_name)')
    .eq('id', row.provider_id)
    .maybeSingle();
  if (pErr) throw pErr;

  const { data: cli, error: cErr } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', row.client_id)
    .maybeSingle();
  if (cErr) throw cErr;

  const provProfiles = provRow?.profiles as { full_name: string | null } | null | undefined;

  return {
    ...row,
    providers: provRow ? { profiles: { full_name: provProfiles?.full_name ?? null } } : null,
    profiles: cli ? { full_name: cli.full_name } : null,
  };
}

export function useBookingDetail(bookingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.booking(bookingId ?? ''),
    enabled: Boolean(bookingId),
    queryFn: () => fetchBookingRow(bookingId!),
  });
}
