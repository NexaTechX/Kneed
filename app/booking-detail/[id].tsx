import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { BookingCard, type BookingRow } from '@/components/booking/BookingCard';
import { Button } from '@/components/ui/Button';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useBookingDetail } from '@/hooks/useBookingDetail';
import { useAuth } from '@/hooks/useAuth';
import { notifyBookingPartner } from '@/lib/bookingNotify';
import { friendlyBookingError } from '@/lib/friendlyError';
import { openPaystackCheckoutForBooking } from '@/lib/paystack';
import { queryKeys } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { canCancel } from '@/lib/utils';

export default function BookingDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof rawId === 'string' ? rawId : rawId?.[0];
  const router = useRouter();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { data, isLoading, isError, error, refetch } = useBookingDetail(id);

  const role = profile?.role === 'provider' ? 'provider' : 'client';

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.bookingsClient() });
    void qc.invalidateQueries({ queryKey: queryKeys.bookingsProvider() });
    if (id) void qc.invalidateQueries({ queryKey: queryKeys.booking(id) });
  };

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
    void invalidateAll();
    await refetch();
    Alert.alert('Done', successMsg);
  };

  const pay = async (b: BookingRow) => {
    const res = await openPaystackCheckoutForBooking(b.id);
    if (res.ok) {
      Alert.alert('Thanks', 'Payment complete? Status will refresh from Paystack shortly.');
      void invalidateAll();
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
            void invalidateAll();
            void refetch();
          }
        },
      },
    ]);
  };

  const accept = (b: BookingRow) => {
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

  if (!id) {
    return (
      <SafeView>
        <Header title="Booking" showBack />
        <Text style={[styles.muted, { color: t.textSecondary }]}>Invalid link.</Text>
      </SafeView>
    );
  }

  if (isLoading) {
    return (
      <SafeView>
        <Header title="Booking" showBack />
        <Text style={[styles.muted, { color: t.textSecondary }]}>Loading…</Text>
      </SafeView>
    );
  }

  if (isError || !data) {
    return (
      <SafeView>
        <Header title="Booking" showBack />
        <Text style={[styles.muted, { color: t.textSecondary }]}>
          {error instanceof Error ? error.message : 'Could not load booking.'}
        </Text>
        <Button title="Try again" onPress={() => void refetch()} style={{ margin: spacing.lg }} />
      </SafeView>
    );
  }

  const b = data;
  const payStatus = b.payment_status ?? 'unpaid';
  const canAccept = role === 'provider' && b.status === 'pending' && payStatus === 'paid';

  return (
    <SafeView>
      <Header title="Booking details" showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <BookingCard booking={b} role={role} hideActions />
        {role === 'client' && b.status !== 'cancelled' && payStatus !== 'paid' ? (
          <Button title="Pay with Paystack" variant="coral" onPress={() => void pay(b)} style={{ marginTop: spacing.md }} />
        ) : null}
        {role === 'client' && b.status === 'completed' ? (
          <Button
            title="Leave review"
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/(client)/review/[bookingId]' as const,
                params: { bookingId: b.id },
              } as never)
            }
            style={{ marginTop: spacing.md }}
          />
        ) : null}
        {role === 'provider' && b.status === 'pending' && payStatus !== 'paid' ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            You can accept after the client pays. They will be notified when payment completes.
          </Text>
        ) : null}
        {role === 'provider' && canAccept ? (
          <Button title="Accept" variant="coral" onPress={() => void accept(b)} style={{ marginTop: spacing.md }} />
        ) : null}
        {role === 'provider' && b.status === 'pending' ? (
          <Button title="Decline" variant="dustyrose" onPress={() => void decline(b)} style={{ marginTop: spacing.sm }} />
        ) : null}
        {role === 'provider' && b.status === 'confirmed' ? (
          <Button title="Mark complete" variant="outline" onPress={() => void complete(b)} style={{ marginTop: spacing.md }} />
        ) : null}
        {role === 'client' && canCancel(b) ? (
          <Pressable
            onPress={() => void cancel(b)}
            style={styles.cancelLink}
            accessibilityRole="button"
            accessibilityLabel="Cancel booking">
            <Text style={[styles.cancelText, { color: t.error }]}>Cancel booking</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeView>
  );
}

function createStyles(_t: AppTheme) {
  return StyleSheet.create({
    muted: { padding: spacing.lg, fontSize: 15 },
    hint: { marginTop: spacing.md, fontSize: 14, lineHeight: 20 },
    cancelLink: { marginTop: spacing.lg, paddingVertical: spacing.sm },
    cancelText: { fontWeight: '700', fontSize: 15 },
  });
}
