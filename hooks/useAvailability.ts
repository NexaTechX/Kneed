import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { Availability, Booking } from '@/types/database';
import type { BookingBlock } from '@/lib/utils';

export function useDayAvailability(providerId: string | undefined, date: Date) {
  const qc = useQueryClient();
  const day = date.getDay();
  const dateKey = formatISO(date, { representation: 'date' });

  const q = useQuery({
    queryKey: queryKeys.availability(providerId ?? '', dateKey),
    enabled: Boolean(providerId),
    queryFn: async () => {
      const { data: availability, error: e1 } = await supabase
        .from('availability')
        .select('*')
        .eq('provider_id', providerId!)
        .eq('day_of_week', day)
        .maybeSingle();
      if (e1) throw e1;

      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();

      const { data: bookingRows, error: e2 } = await supabase
        .from('bookings')
        .select('scheduled_at, status, services(duration_min)')
        .eq('provider_id', providerId!)
        .gte('scheduled_at', start)
        .lte('scheduled_at', end);
      if (e2) throw e2;

      const blocks: BookingBlock[] = (bookingRows ?? []).map((row: unknown) => {
        const r = row as {
          scheduled_at: string;
          status: Booking['status'];
          services: { duration_min: number } | null;
        };
        return {
          scheduled_at: r.scheduled_at,
          status: r.status,
          duration_min: r.services?.duration_min ?? 60,
        };
      });

      return {
        availability: availability as Availability | null,
        bookingBlocks: blocks,
      };
    },
  });

  useEffect(() => {
    if (!providerId) return;
    const ch = supabase
      .channel(`availability-${providerId}-${dateKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          void qc.invalidateQueries({ queryKey: queryKeys.availability(providerId, dateKey) });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc, providerId, dateKey]);

  return q;
}
