import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BookingTimeline } from '@/components/booking/BookingTimeline';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useProviderBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/types/database';

export default function ProviderDashboardScreen() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useProviderBookings();

  const { data: provider } = useQuery({
    queryKey: ['provider-me', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('providers').select('*').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const today = useMemo(() => new Date(), []);
  const todayBookings = useMemo(() => {
    const list = bookings ?? [];
    return list.filter((b) => {
      const t = new Date(b.scheduled_at);
      return (
        t.getFullYear() === today.getFullYear() && t.getMonth() === today.getMonth() && t.getDate() === today.getDate()
      );
    });
  }, [bookings, today]);

  return (
    <SafeView>
      <Text style={styles.title}>Dashboard</Text>
      {provider && !provider.is_verified ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Badge label="Verification pending" tone="warning" />
        </View>
      ) : null}
      {isLoading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Card>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>{todayBookings.length} appointments</Text>
          </Card>
          <Text style={styles.section}>Timeline</Text>
          <BookingTimeline bookings={(bookings ?? []) as Booking[]} date={today} />
        </ScrollView>
      )}
    </SafeView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.charcoal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  muted: { color: colors.stone, padding: spacing.lg },
  statLabel: { color: colors.stone, fontSize: 13 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.coral, marginTop: 4 },
  section: { marginTop: spacing.lg, fontSize: 18, fontWeight: '700', color: colors.charcoal },
});
