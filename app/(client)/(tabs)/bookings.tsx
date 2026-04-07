import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { BookingCard, type BookingRow } from '@/components/booking/BookingCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useClientBookings } from '@/hooks/useBookings';
import { supabase } from '@/lib/supabase';
export default function ClientBookingsScreen() {
  const { data, isLoading, refetch, isRefetching } = useClientBookings();
  const router = useRouter();

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
      <Text style={styles.title}>My bookings</Text>
      {isLoading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.id}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              role="client"
              onCancel={() => void cancel(item)}
              onReview={
                item.status === 'completed'
                  ? () =>
                      router.push({
                        pathname: '/(client)/review/[bookingId]' as const,
                        params: { bookingId: item.id },
                      } as never)
                  : undefined
              }
            />
          )}
          ListEmptyComponent={<Text style={styles.muted}>No bookings yet.</Text>}
        />
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
    marginBottom: spacing.sm,
  },
  muted: { color: colors.stone, padding: spacing.lg },
});
