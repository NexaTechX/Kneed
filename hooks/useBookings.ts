import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/types/database';
import type { BookingRow } from '@/components/booking/BookingCard';

async function fetchClientBookings(): Promise<BookingRow[]> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, services (type, duration_min)')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  if (!bookings?.length) return [];

  const providerIds = [...new Set(bookings.map((b) => (b as Booking).provider_id))];
  const { data: profiles, error: e2 } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', providerIds);
  if (e2) throw e2;
  const map = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return bookings.map((b) => {
    const row = b as BookingRow;
    return {
      ...row,
      providers: { profiles: { full_name: map.get(row.provider_id) ?? null } },
    };
  });
}

async function fetchProviderBookings(): Promise<BookingRow[]> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, services (type, duration_min)')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  if (!bookings?.length) return [];

  const clientIds = [...new Set(bookings.map((b) => (b as Booking).client_id))];
  const { data: profiles, error: e2 } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', clientIds);
  if (e2) throw e2;
  const map = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return bookings.map((b) => {
    const row = b as BookingRow;
    return {
      ...row,
      profiles: { full_name: map.get(row.client_id) ?? null },
    };
  });
}

export function useClientBookings() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: queryKeys.bookingsClient(),
    queryFn: fetchClientBookings,
  });

  useEffect(() => {
    const ch = supabase
      .channel('bookings-client')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          void qc.invalidateQueries({ queryKey: queryKeys.bookingsClient() });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  return q;
}

export function useProviderBookings() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: queryKeys.bookingsProvider(),
    queryFn: fetchProviderBookings,
  });

  useEffect(() => {
    const ch = supabase
      .channel('bookings-provider')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          void qc.invalidateQueries({ queryKey: queryKeys.bookingsProvider() });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  return q;
}
