import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { endOfWeek, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import { SafeView } from '@/components/layout/SafeView';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { BookingTimeline } from '@/components/booking/BookingTimeline';
import type { BookingRow } from '@/components/booking/BookingCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { useProviderBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { formatCents } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function ProviderDashboardScreen() {
  const { user, profile } = useAuth();
  const { data: bookings, isLoading } = useProviderBookings();

  const { data: provider } = useQuery({
    queryKey: ['provider-me', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('providers').select('*').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const today = useMemo(() => new Date(), []);

  const todayBookings = useMemo(() => {
    const list = (bookings ?? []) as BookingRow[];
    return list.filter((b) => {
      const t = new Date(b.scheduled_at);
      return (
        t.getFullYear() === today.getFullYear() && t.getMonth() === today.getMonth() && t.getDate() === today.getDate()
      );
    });
  }, [bookings, today]);

  const weekRange = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });
    return { start, end };
  }, [today]);

  const weeklyNet = useMemo(() => {
    const list = (bookings ?? []) as BookingRow[];
    const done = list.filter(
      (b) =>
        b.status === 'completed' &&
        isWithinInterval(parseISO(b.scheduled_at), { start: weekRange.start, end: weekRange.end }),
    );
    const gross = done.reduce((s, b) => s + b.price_cents, 0);
    const fees = done.reduce((s, b) => s + b.platform_fee_cents, 0);
    return gross - fees;
  }, [bookings, weekRange]);

  const progressPct = useMemo(() => {
    const goal = Math.max(Math.round(weeklyNet * 1.25), 50_000);
    return Math.min(100, Math.round((weeklyNet / goal) * 100));
  }, [weeklyNet]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <SafeView>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>Hello,</Text>
            <Text style={[textStyles.titleSerif, styles.nameLine]}>{firstName}</Text>
          </View>
          <Avatar name={profile?.full_name ?? '?'} uri={profile?.avatar_url} size={52} />
        </View>

        {provider && !provider.is_verified ? (
          <View style={styles.badgeRow}>
            <Badge label="Verification pending" tone="warning" />
          </View>
        ) : null}

        {isLoading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : (
          <>
            <LinearGradient
              colors={[colors.dustyRoseCard, colors.badgeRose]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.earnCard}>
              <View style={styles.earnTop}>
                <Text style={styles.earnLabel}>This week</Text>
                <View style={styles.growthBadge}>
                  <FontAwesome name="arrow-up" size={12} color={colors.success} />
                  <Text style={styles.growthText}>+8%</Text>
                </View>
              </View>
              <Text style={styles.earnAmount}>{formatCents(Math.max(0, weeklyNet))}</Text>
              <Text style={styles.earnSub}>Estimated net after fees</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${progressPct}%` }]} />
              </View>
            </LinearGradient>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{todayBookings.length}</Text>
                <Text style={styles.statLab}>Today</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{provider?.average_rating?.toFixed(1) ?? '—'}</Text>
                <Text style={styles.statLab}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{formatCents(weeklyNet)}</Text>
                <Text style={styles.statLab}>Week</Text>
              </View>
            </View>

            <Text style={styles.section}>Today</Text>
            <BookingTimeline bookings={(bookings ?? []) as BookingRow[]} date={today} />
          </>
        )}
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greet: { fontFamily: fonts.body, fontSize: 15, color: colors.stone },
  nameLine: { marginTop: 2 },
  badgeRow: { marginBottom: spacing.md },
  muted: { color: colors.stone, fontFamily: fonts.body },
  earnCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  earnTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earnLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mauve },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  growthText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.success },
  earnAmount: {
    fontFamily: fonts.serifBold,
    fontSize: 36,
    color: colors.mauve,
    marginTop: spacing.sm,
  },
  earnSub: { fontFamily: fonts.body, fontSize: 14, color: colors.mauve, opacity: 0.85, marginTop: 4 },
  track: {
    marginTop: spacing.md,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.mauve,
  },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  statVal: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.brown },
  statLab: { fontFamily: fonts.body, fontSize: 12, color: colors.stone, marginTop: 4 },
  section: {
    fontFamily: fonts.serifSemi,
    fontSize: 20,
    color: colors.brownDark,
    marginBottom: spacing.md,
  },
});
