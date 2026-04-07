import { StyleSheet, Text, View } from 'react-native';
import { parseISO } from 'date-fns';
import type { Booking } from '@/types/database';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

export function BookingTimeline({
  bookings,
  date,
}: {
  bookings: Booking[];
  date: Date;
}) {
  const dayBookings = bookings
    .filter((b) => {
      const t = parseISO(b.scheduled_at);
      return (
        t.getFullYear() === date.getFullYear() &&
        t.getMonth() === date.getMonth() &&
        t.getDate() === date.getDate()
      );
    })
    .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime());

  if (dayBookings.length === 0) {
    return <Text style={styles.empty}>No appointments today.</Text>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.line} />
      <View style={styles.list}>
        {dayBookings.map((b) => {
          const t = parseISO(b.scheduled_at);
          return (
            <View key={b.id} style={styles.row}>
              <View style={styles.dot} />
              <View style={styles.card}>
                <Text style={styles.time}>{t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                <Text style={styles.title}>{b.status}</Text>
                <Text style={styles.meta}>{b.location_type === 'mobile' ? 'Mobile' : 'Studio'}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  line: {
    width: 3,
    backgroundColor: colors.dustyrose,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  list: { flex: 1, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.coral,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dustyrose,
  },
  time: { fontSize: 12, color: colors.stone },
  title: { fontSize: 15, fontWeight: '700', color: colors.charcoal },
  meta: { marginTop: 4, fontSize: 13, color: colors.stone },
  empty: { color: colors.stone },
});
