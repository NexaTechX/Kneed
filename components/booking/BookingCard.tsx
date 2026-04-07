import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Booking } from '@/types/database';
import { canCancel, formatCents } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
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
  role,
}: {
  booking: BookingRow;
  onCancel?: () => void;
  onReview?: () => void;
  role: 'client' | 'provider';
}) {
  const partnerName =
    role === 'client'
      ? booking.providers?.profiles?.full_name ?? 'Provider'
      : booking.profiles?.full_name ?? 'Client';
  const serviceLabel = booking.services?.type?.replace('_', ' ') ?? 'Service';

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{partnerName}</Text>
          <Text style={styles.meta}>
            {serviceLabel} · {new Date(booking.scheduled_at).toLocaleString()}
          </Text>
          <Text style={styles.meta}>
            {booking.location_type === 'mobile' ? 'Mobile' : 'Studio'}{' '}
            <FontAwesome name="map-marker" size={14} color={colors.stone} />
          </Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>
      <Text style={styles.price}>{formatCents(booking.total_cents)} total</Text>
      {role === 'client' && booking.status === 'completed' && onReview ? (
        <Button title="Leave review" variant="outline" onPress={onReview} style={{ marginTop: spacing.sm }} />
      ) : null}
      {role === 'client' && canCancel(booking) && onCancel ? (
        <Button title="Cancel booking" variant="dustyrose" onPress={onCancel} style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const tone =
    status === 'confirmed' || status === 'completed'
      ? 'success'
      : status === 'pending'
        ? 'warning'
        : 'neutral';
  return <Badge label={status} tone={tone} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dustyrose,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 17, fontWeight: '700', color: colors.charcoal },
  meta: { marginTop: 4, fontSize: 13, color: colors.stone },
  price: { marginTop: spacing.sm, fontSize: 15, fontWeight: '600', color: colors.charcoal },
});
