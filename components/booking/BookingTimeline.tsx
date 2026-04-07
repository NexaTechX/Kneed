import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { parseISO } from 'date-fns';
import type { BookingRow } from '@/components/booking/BookingCard';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts } from '@/constants/typography';

export function BookingTimeline({
  bookings,
  date,
}: {
  bookings: BookingRow[];
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
          const client = b.profiles?.full_name ?? 'Client';
          const service = b.services?.type?.replace('_', ' ') ?? 'Session';
          return (
            <View key={b.id} style={styles.row}>
              <View style={styles.dot} />
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Avatar name={client} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.time}>{t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                    <Text style={styles.name}>{client}</Text>
                    <Text style={styles.service}>{service}</Text>
                  </View>
                  <View style={styles.locBadge}>
                    <FontAwesome
                      name={b.location_type === 'mobile' ? 'car' : 'building'}
                      size={14}
                      color={colors.teal}
                    />
                  </View>
                </View>
                <View style={styles.statusRow}>
                  <View style={[styles.statusPill, b.status === 'confirmed' && styles.statusOn]}>
                    <Text style={styles.statusText}>{b.status}</Text>
                  </View>
                </View>
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
    backgroundColor: colors.badgeRose,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  list: { flex: 1, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.coralBright,
    marginTop: 18,
    marginRight: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  time: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.coralBright },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.brown, marginTop: 2 },
  service: { fontFamily: fonts.body, fontSize: 13, color: colors.stone, marginTop: 2, textTransform: 'capitalize' },
  locBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.badgePink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { marginTop: spacing.sm, flexDirection: 'row' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.segmentBg,
  },
  statusOn: { backgroundColor: colors.badgePink },
  statusText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.brown,
    textTransform: 'capitalize',
  },
  empty: { color: colors.stone, fontFamily: fonts.body },
});
