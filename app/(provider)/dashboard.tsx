import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { Badge } from '@/components/ui/Badge';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useProviderBookings } from '@/hooks/useBookings';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatCents } from '@/lib/utils';
import type { BookingRow } from '@/components/booking/BookingCard';
import { Avatar } from '@/components/ui/Avatar';

export default function ProviderDashboardScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();
  const { data: bookings, isLoading } = useProviderBookings();

  const { data: provider } = useQuery({
    queryKey: ['provider-me', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [{ data: prov, error: e1 }, { data: profile, error: e2 }] = await Promise.all([
        supabase.from('providers').select('*').eq('id', user!.id).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle(),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { ...prov, profile_name: profile?.full_name ?? null };
    },
  });

  const today = useMemo(() => new Date(), []);
  const todayBookings = useMemo(() => {
    const list = bookings ?? [];
    return list.filter((b) => {
      const time = new Date(b.scheduled_at);
      return (
        time.getFullYear() === today.getFullYear() &&
        time.getMonth() === today.getMonth() &&
        time.getDate() === today.getDate()
      );
    });
  }, [bookings, today]);
  const providerName = provider?.profile_name ?? user?.email?.split('@')[0] ?? 'Therapist';
  const firstName = providerName.split(' ')[0];
  const greeting = getGreeting(today);

  const weeklyEarnings = useMemo(
    () =>
      (bookings ?? [])
        .filter((b) => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum, b) => sum + b.total_cents, 0),
    [bookings],
  );

  const confirmedCount = useMemo(
    () => (todayBookings as BookingRow[]).filter((b) => b.status === 'confirmed').length,
    [todayBookings],
  );
  const timelineItems = useMemo(() => {
    const live = (todayBookings as BookingRow[])
      .slice()
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .map((b) => ({
        kind: 'booking' as const,
        id: b.id,
        time: new Date(b.scheduled_at),
        booking: b,
      }));

    const blocked = {
      kind: 'blocked' as const,
      id: 'blocked-lunch',
      time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0, 0),
    };

    const withBlocked = [...live];
    if (!live.some((e) => e.time.getHours() === 11)) {
      withBlocked.push(blocked);
    }
    return withBlocked.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [todayBookings, today]);

  return (
    <SafeView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerIdentity}>
            <Avatar name={providerName} size={42} />
            <Text style={styles.greetingText}>
              {greeting}, {firstName}
            </Text>
          </View>
          <Pressable style={styles.bellBtn}>
            <FontAwesome name="bell" size={16} color="#7C5A62" />
          </Pressable>
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Weekly Earnings</Text>
          <Text style={styles.earningsValue}>{formatCents(weeklyEarnings)} this week</Text>
          <View style={styles.growthPill}>
            <Text style={styles.growthText}>↗ +12%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatTile icon="calendar-check-o" value={todayBookings.length} label="TODAY" />
          <StatTile icon="star" value={provider?.average_rating?.toFixed(1) ?? '0.0'} label="RATING" />
          <StatTile icon="calendar" value={(bookings ?? []).length} label="WEEKLY" />
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <Text style={styles.sectionDate}>{today.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        </View>

      {provider && !provider.is_verified ? (
        <View style={[styles.alert, { backgroundColor: '#F6E8E2', borderColor: '#E9D2C8' }]}>
          <Badge label="Verification pending" tone="warning" />
          <Text style={[styles.verifyHint, { color: t.textSecondary }]}>
            You are not visible in Discover until an admin approves your license. Clients cannot book you through search
            until then.
          </Text>
        </View>
      ) : null}

        {isLoading ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : (
          <View style={styles.timelineWrap}>
            {timelineItems.map((entry, index) => (
              <View key={entry.id} style={styles.timelineItem}>
                <View style={styles.timelineMarkerWrap}>
                  <View style={[styles.timelineDot, entry.kind === 'blocked' && styles.timelineDotMuted]} />
                  {index < timelineItems.length - 1 ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timeText}>
                    {entry.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  {entry.kind === 'booking' ? (
                    <View>
                      <View style={styles.statusRow}>
                        <Text style={styles.emptyStatusSpacer}> </Text>
                        {entry.booking.status === 'confirmed' ? <Text style={styles.confirmedPill}>Confirmed</Text> : null}
                      </View>
                      <View style={styles.sessionCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sessionTitle}>
                            {entry.booking.services?.type?.replace('_', ' ') ?? 'Session'} -{' '}
                            {entry.booking.profiles?.full_name ?? 'Client'}
                          </Text>
                          <Text style={styles.sessionMeta}>
                            {entry.booking.location_type === 'mobile' ? 'Home visit' : 'Studio'} •{' '}
                            {entry.booking.services?.duration_min ?? 60} min
                          </Text>
                        </View>
                        <Avatar name={entry.booking.profiles?.full_name ?? 'Client'} size={46} />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.blockedCard}>
                      <FontAwesome name="ban" size={14} color="#716B64" />
                      <Text style={styles.blockedText}>Blocked - Lunch break</Text>
                    </View>
                  )}
                  {timelineItems.length === 0 ? (
                    <View style={styles.blockedCard}>
                      <FontAwesome name="clock-o" size={14} color="#716B64" />
                      <Text style={styles.blockedText}>No sessions yet</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
            {timelineItems.length === 0 ? (
              <View style={styles.timelineItem}>
                <View style={styles.timelineMarkerWrap}>
                  <View style={styles.timelineDotMuted} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timeText}>9:00 AM</Text>
                  <View style={styles.blockedCard}>
                    <FontAwesome name="calendar-o" size={14} color="#716B64" />
                    <Text style={styles.blockedText}>Open for bookings</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
      <Pressable style={styles.fab}>
        <FontAwesome name="external-link" size={20} color="#FFFFFF" />
      </Pressable>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    page: { backgroundColor: '#F5F3EF' },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    greetingText: { color: '#533E48', fontSize: 38 / 2, fontWeight: '800', letterSpacing: -0.3 },
    bellBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    earningsCard: {
      backgroundColor: '#D9ADB3',
      borderRadius: 26,
      padding: spacing.lg,
      position: 'relative',
    },
    earningsLabel: { color: '#6C4A52', fontSize: 16, fontWeight: '600' },
    earningsValue: { marginTop: spacing.xs, color: '#4A3037', fontSize: 58 / 2, fontWeight: '800', maxWidth: 220, lineHeight: 62 / 2 },
    growthPill: {
      position: 'absolute',
      right: spacing.lg,
      top: spacing.xl,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: '#EAC7CC',
    },
    growthText: { color: '#6D4A53', fontSize: 14, fontWeight: '700' },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: '#CCA1A8',
      marginTop: spacing.lg,
      overflow: 'hidden',
    },
    progressFill: { width: '74%', height: '100%', backgroundColor: '#714B54' },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    sectionTitle: { color: '#1F1C19', fontSize: 35 / 2, fontWeight: '800' },
    sectionDate: { color: '#7E7872', fontSize: 14 },
    alert: {
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      gap: spacing.sm,
    },
    timelineWrap: { gap: spacing.md, paddingBottom: 90 },
    timelineItem: { flexDirection: 'row', alignItems: 'stretch' },
    timelineMarkerWrap: { width: 22, alignItems: 'center' },
    timelineDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#B25E46',
      marginTop: 8,
    },
    timelineDotMuted: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#D9D2C9',
      marginTop: 8,
    },
    timelineLine: { width: 1.5, flex: 1, backgroundColor: '#E2C9C1', marginTop: 4 },
    timelineBody: { flex: 1, marginLeft: spacing.sm, paddingBottom: spacing.md },
    timeText: { color: '#8A4A39', fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    emptyStatusSpacer: { opacity: 0 },
    confirmedPill: {
      backgroundColor: '#F4DCD5',
      color: '#8D4F40',
      fontSize: 12,
      fontWeight: '700',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      overflow: 'hidden',
    },
    sessionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#EDE7DE',
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sessionTitle: { color: '#23201D', fontSize: 32 / 2, fontWeight: '800' },
    sessionMeta: { color: '#6C655D', fontSize: 15, marginTop: 6 },
    blockedCard: {
      backgroundColor: '#F2EFEA',
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#DBD3CA',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    blockedText: { color: '#5C5751', fontSize: 30 / 2, fontWeight: '700' },
    muted: { padding: spacing.lg, fontSize: 15, color: '#7A746D' },
    verifyHint: { fontSize: 14, lineHeight: 20 },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      bottom: 108,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#B65B3B',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(84, 50, 38, 0.35)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 7,
    },
  });
}

function StatTile({ icon, value, label }: { icon: keyof typeof FontAwesome.glyphMap; value: string | number; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ECE6DD',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 4,
      }}>
      <FontAwesome name={icon} size={16} color="#775763" />
      <Text style={{ color: '#1E1B18', fontSize: 33 / 2, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: '#8E877D', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{label}</Text>
    </View>
  );
}

function getGreeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
