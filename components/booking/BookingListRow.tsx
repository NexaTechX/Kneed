import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { BookingRow } from '@/components/booking/BookingCard';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts } from '@/constants/typography';
import { formatCents } from '@/lib/utils';

export function BookingListRow({
  booking,
  onPress,
  onCancel,
  onReview,
}: {
  booking: BookingRow;
  onPress?: () => void;
  onCancel?: () => void;
  onReview?: () => void;
}) {
  const partner =
    booking.providers?.profiles?.full_name ?? booking.profiles?.full_name ?? 'Session';
  const service = booking.services?.type?.replace('_', ' ') ?? 'Service';
  const t = new Date(booking.scheduled_at);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={styles.meta}>
              <Text style={styles.time}>{t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
              <Text style={styles.price}>{formatCents(booking.total_cents)}</Text>
            </View>
            <Text style={styles.title}>{service}</Text>
            <Text style={styles.sub}>with {partner}</Text>
            <View style={styles.statusRow}>
              <View style={styles.dot} />
              <Text style={styles.status}>{booking.status}</Text>
            </View>
          </View>
          <FontAwesome name="chevron-right" size={20} color={colors.stone} />
        </View>
      </Pressable>
      {(onReview || onCancel) && (
        <View style={styles.actions}>
          {onReview ? (
            <Button title="Review" variant="outline" onPress={onReview} style={styles.actionBtn} />
          ) : null}
          {onCancel ? (
            <Button title="Cancel" variant="dustyrose" onPress={onCancel} style={styles.actionBtn} />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: 2,
  },
  actionBtn: { flex: 1, marginTop: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.coralBright },
  price: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.brown },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.brown,
    marginTop: 4,
  },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.stone, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.terracotta,
  },
  status: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.brown,
    textTransform: 'capitalize',
  },
});
