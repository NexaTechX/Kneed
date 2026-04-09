import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { parseISO } from 'date-fns';
import type { Booking } from '@/types/database';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

export function BookingTimeline({
  bookings,
  date,
}: {
  bookings: Booking[];
  date: Date;
}) {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const dayBookings = bookings
    .filter((b) => {
      const time = parseISO(b.scheduled_at);
      return (
        time.getFullYear() === date.getFullYear() &&
        time.getMonth() === date.getMonth() &&
        time.getDate() === date.getDate()
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
          const time = parseISO(b.scheduled_at);
          return (
            <View key={b.id} style={styles.row}>
              <View style={styles.dot} />
              <View style={styles.card}>
                <Text style={styles.time}>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
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

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    wrap: { flexDirection: 'row' },
    line: {
      width: 3,
      backgroundColor: t.primaryMuted,
      borderRadius: 2,
      marginRight: spacing.md,
    },
    list: { flex: 1, gap: spacing.md },
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: t.primary,
      marginTop: 6,
      marginRight: spacing.sm,
    },
    card: {
      flex: 1,
      backgroundColor: t.surfaceElevated,
      borderRadius: 14,
      padding: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    time: { fontSize: 12, fontWeight: '700', color: t.textTertiary },
    title: { fontSize: 15, fontWeight: '800', color: t.text, textTransform: 'capitalize' },
    meta: { marginTop: 4, fontSize: 13, color: t.textSecondary },
    empty: { color: t.textSecondary },
  });
}
