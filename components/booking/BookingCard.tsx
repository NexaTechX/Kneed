import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Booking } from '@/types/database';
import { canCancel, formatCents } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

export type BookingRow = Booking & {
  services?: { type: string; duration_min: number } | null;
  providers?: { profiles?: { full_name: string | null } | null } | null;
  profiles?: { full_name: string | null } | null;
};

export function BookingCard({
  booking,
  onCancel,
  onReview,
  onAccept,
  onDecline,
  onMarkComplete,
  onPay,
  role,
  highlighted,
  hideActions,
}: {
  booking: BookingRow;
  onCancel?: () => void;
  onReview?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onMarkComplete?: () => void;
  onPay?: () => void;
  role: 'client' | 'provider';
  highlighted?: boolean;
  /** Summary-only card (e.g. booking detail screen renders actions separately). */
  hideActions?: boolean;
}) {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const partnerName =
    role === 'client'
      ? booking.providers?.profiles?.full_name ?? 'Provider'
      : booking.profiles?.full_name ?? 'Client';
  const serviceLabel = booking.services?.type?.replace('_', ' ') ?? 'Service';
  const payStatus = booking.payment_status ?? 'unpaid';

  return (
    <View style={[styles.card, highlighted && styles.cardHighlight]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{partnerName}</Text>
          <Text style={styles.meta}>
            {serviceLabel} · {new Date(booking.scheduled_at).toLocaleString()}
          </Text>
          <Text style={styles.meta}>
            {booking.location_type === 'mobile' ? 'Mobile' : 'Studio'}{' '}
            <FontAwesome name="map-marker" size={14} color={t.textTertiary} />
          </Text>
          {booking.address ? (
            <Text style={styles.meta} numberOfLines={2}>
              {booking.address}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={booking.status} />
      </View>
      <Text style={styles.price}>{formatCents(booking.total_cents)} total</Text>
      {role === 'client' && payStatus !== 'paid' ? (
        <Text style={styles.payMeta}>Payment: {payStatus}</Text>
      ) : null}
      {role === 'provider' && booking.status === 'pending' && payStatus !== 'paid' && !hideActions ? (
        <Text style={styles.payMeta}>Waiting for client payment before you can accept.</Text>
      ) : null}
      {!hideActions && role === 'client' && booking.status !== 'cancelled' && payStatus !== 'paid' && onPay ? (
        <Button title="Pay with Paystack" variant="coral" onPress={onPay} style={{ marginTop: spacing.sm }} />
      ) : null}
      {!hideActions && role === 'client' && booking.status === 'completed' && onReview ? (
        <Button title="Leave review" variant="outline" onPress={onReview} style={{ marginTop: spacing.sm }} />
      ) : null}
      {!hideActions && role === 'client' && canCancel(booking) && onCancel ? (
        <Button title="Cancel booking" variant="dustyrose" onPress={onCancel} style={{ marginTop: spacing.sm }} />
      ) : null}
      {!hideActions && role === 'provider' && onAccept ? (
        <Button title="Accept" variant="coral" onPress={onAccept} style={{ marginTop: spacing.sm }} />
      ) : null}
      {!hideActions && role === 'provider' && onDecline ? (
        <Button title="Decline" variant="dustyrose" onPress={onDecline} style={{ marginTop: spacing.sm }} />
      ) : null}
      {!hideActions && role === 'provider' && onMarkComplete ? (
        <Button title="Mark complete" variant="outline" onPress={onMarkComplete} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  if (status === 'disputed') {
    return <Badge label="Needs support" tone="neutral" />;
  }
  const tone =
    status === 'confirmed' || status === 'completed'
      ? 'success'
      : status === 'pending'
        ? 'warning'
        : 'neutral';
  return <Badge label={status} tone={tone} />;
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 18,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 2,
    },
    cardHighlight: {
      borderWidth: 2,
      borderColor: t.primary,
    },
    top: { flexDirection: 'row', alignItems: 'flex-start' },
    title: { fontSize: 17, fontWeight: '800', color: t.text, letterSpacing: -0.2 },
    meta: { marginTop: 4, fontSize: 13, color: t.textSecondary, lineHeight: 18 },
    price: { marginTop: spacing.sm, fontSize: 15, fontWeight: '700', color: t.text },
    payMeta: { marginTop: 4, fontSize: 12, color: t.textTertiary, textTransform: 'capitalize' },
  });
}
