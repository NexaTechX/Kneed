import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenTitle } from '@/components/layout/ScreenTitle';
import { Button } from '@/components/ui/Button';
import { BookingCard, type BookingRow } from '@/components/booking/BookingCard';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useClientBookings } from '@/hooks/useBookings';
import { notifyBookingPartner } from '@/lib/bookingNotify';
import { friendlyBookingError } from '@/lib/friendlyError';
import { openPaystackCheckoutForBooking } from '@/lib/paystack';
import { supabase } from '@/lib/supabase';

export default function ClientBookingsScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { data, isLoading, isError, error, refetch, isRefetching } = useClientBookings();
  const router = useRouter();
  const listRef = useRef<FlatList<BookingRow>>(null);
  const params = useLocalSearchParams<{ highlight?: string | string[] }>();
  const highlightId =
    typeof params.highlight === 'string' ? params.highlight : params.highlight?.[0];

  useEffect(() => {
    if (!highlightId || !data?.length) return;
    const index = data.findIndex((b) => b.id === highlightId);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.25 });
    }, 350);
    return () => clearTimeout(timer);
  }, [highlightId, data]);

  const pay = async (b: BookingRow) => {
    const res = await openPaystackCheckoutForBooking(b.id);
    if (res.ok) {
      Alert.alert('Thanks', 'Payment complete? Status will refresh from Paystack shortly.');
      void refetch();
    } else {
      Alert.alert('Paystack', res.message);
    }
  };

  const cancel = async (b: BookingRow) => {
    Alert.alert('Cancel booking?', 'You can cancel if more than 24h before the session.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          const { error: upErr } = await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'client',
            })
            .eq('id', b.id);
          if (upErr) Alert.alert('Error', friendlyBookingError(upErr.message));
          else {
            notifyBookingPartner(b.id, 'client_cancelled');
            void refetch();
          }
        },
      },
    ]);
  };

  return (
    <SafeView>
      <ScreenTitle kicker="Your sessions" title="Bookings" />
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
          ref={listRef}
          data={data ?? []}
          keyExtractor={(i) => i.id}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToOffset({
                offset: Math.max(0, info.averageItemLength * info.index),
                animated: true,
              });
            }, 120);
          }}
          renderItem={({ item }) => (
            <View>
              <BookingCard
                booking={item}
                role="client"
                highlighted={highlightId === item.id}
                onPay={
                  item.status !== 'cancelled' && (item.payment_status ?? 'unpaid') !== 'paid'
                    ? () => void pay(item)
                    : undefined
                }
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
