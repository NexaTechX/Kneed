import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenTitle } from '@/components/layout/ScreenTitle';
import { Button } from '@/components/ui/Button';
import { BookingCard, type BookingRow } from '@/components/booking/BookingCard';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useProviderBookings } from '@/hooks/useBookings';
import { notifyBookingPartner } from '@/lib/bookingNotify';
import { friendlyBookingError } from '@/lib/friendlyError';
import { supabase } from '@/lib/supabase';

export default function ProviderBookingsScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useProviderBookings();

  const updateBooking = async (
    b: BookingRow,
    patch: Record<string, unknown>,
    successMsg: string,
    notify?: Parameters<typeof notifyBookingPartner>[1],
  ) => {
    const { error: upErr } = await supabase.from('bookings').update(patch).eq('id', b.id);
    if (upErr) {
      Alert.alert('Error', friendlyBookingError(upErr.message));
      return;
    }
    if (notify) notifyBookingPartner(b.id, notify);
    void refetch();
    Alert.alert('Done', successMsg);
  };

  const accept = (b: BookingRow) => {
    if ((b.payment_status ?? 'unpaid') !== 'paid') {
      Alert.alert('Payment required', 'The client must pay before you can confirm this booking.');
      return;
    }
    Alert.alert('Accept booking?', 'The client will see this as confirmed.', [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Accept',
        onPress: () =>
          void updateBooking(b, { status: 'confirmed' }, 'Booking confirmed.', 'provider_confirmed'),
      },
    ]);
  };

  const decline = (b: BookingRow) => {
    Alert.alert('Decline request?', 'The client will be notified this slot is not available.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () =>
          void updateBooking(
            b,
            {
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'provider',
            },
            'Booking declined.',
            'provider_declined',
          ),
      },
    ]);
  };

  const complete = (b: BookingRow) => {
    Alert.alert('Mark complete?', 'Marks this session as finished so the client can leave a review.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark complete',
        onPress: () => void updateBooking(b, { status: 'completed' }, 'Marked complete.', 'provider_completed'),
      },
    ]);
  };

  return (
    <SafeView>
      <ScreenTitle kicker="Requests & sessions" title="Bookings" />
      {isLoading ? (
        <Text style={[styles.muted, { color: t.textSecondary }]}>Loading…</Text>
      ) : isError ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={[styles.muted, { color: t.textSecondary }]}>
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </Text>
          <Button title="Try again" onPress={() => void refetch()} style={{ marginTop: spacing.md }} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.id}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <View>
              <BookingCard
                booking={item}
                role="provider"
                onAccept={
                  item.status === 'pending' && (item.payment_status ?? 'unpaid') === 'paid'
                    ? () => void accept(item)
                    : undefined
                }
                onDecline={item.status === 'pending' ? () => void decline(item) : undefined}
                onMarkComplete={item.status === 'confirmed' ? () => void complete(item) : undefined}
              />
              <Button
                title="View details"
                variant="outline"
                onPress={() => router.push(`/booking-detail/${item.id}` as never)}
                style={{ marginBottom: spacing.md }}
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.muted, { color: t.textSecondary }]}>No bookings yet.</Text>
          }
        />
      )}
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    muted: { padding: spacing.lg, fontSize: 15 },
  });
}
