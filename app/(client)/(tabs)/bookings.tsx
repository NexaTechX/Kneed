import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { BookingListRow } from '@/components/booking/BookingListRow';
import type { BookingRow } from '@/components/booking/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { useClientBookings } from '@/hooks/useBookings';
import { canCancel } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

function bookingIsPast(b: BookingRow): boolean {
  if (b.status === 'completed' || b.status === 'cancelled') return true;
  return new Date(b.scheduled_at) < new Date();
}

export default function ClientBookingsScreen() {
  const { data, isLoading, refetch, isRefetching } = useClientBookings();
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const filtered = useMemo(() => {
    const all = data ?? [];
    if (tab === 'upcoming') return all.filter((b) => !bookingIsPast(b)).sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
    return all.filter((b) => bookingIsPast(b)).sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at));
  }, [data, tab]);

  const cancel = async (b: BookingRow) => {
    Alert.alert('Cancel booking?', 'You can cancel if more than 24h before the session.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'client',
            })
            .eq('id', b.id);
          if (error) Alert.alert('Error', error.message);
          else void refetch();
        },
      },
    ]);
  };

  return (
    <SafeView>
      <Text style={[textStyles.heroSerif, styles.title]}>Bookings</Text>
      <View style={styles.tabs}>
        <SegmentedTabs
          tabs={[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {isLoading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <BookingListRow
              booking={item}
              onReview={
                tab === 'past' && item.status === 'completed'
                  ? () =>
                      router.push({
                        pathname: '/(client)/review/[bookingId]' as const,
                        params: { bookingId: item.id },
                      } as never)
                  : undefined
              }
              onCancel={tab === 'upcoming' && canCancel(item) ? () => void cancel(item) : undefined}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={tab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
              subtitle={
                tab === 'upcoming'
                  ? 'Discover a therapist and book your first ritual.'
                  : 'Completed and cancelled visits appear here.'
              }
              actionLabel={tab === 'upcoming' ? 'Explore treatments' : undefined}
              onAction={tab === 'upcoming' ? () => router.push('/(client)/(tabs)/discover') : undefined}
              illustration={
                <Text style={{ fontSize: 40 }} accessibilityLabel="">
                  {tab === 'upcoming' ? '📅' : '✓'}
                </Text>
              }
            />
          }
        />
      )}
    </SafeView>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tabs: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, flexGrow: 1 },
  muted: { color: colors.stone, padding: spacing.lg, fontFamily: fonts.body },
});
