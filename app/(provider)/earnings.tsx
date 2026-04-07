import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { SafeView } from '@/components/layout/SafeView';
import { Card } from '@/components/ui/Card';
import { GradientButton } from '@/components/ui/GradientButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { formatCents } from '@/lib/utils';
import { useProviderBookings } from '@/hooks/useBookings';
import type { BookingRow } from '@/components/booking/BookingCard';

type Range = 'week' | 'month' | 'all';

export default function ProviderEarningsScreen() {
  const { data, isLoading } = useProviderBookings();
  const [range, setRange] = useState<Range>('week');

  const { available, lines, recent } = useMemo(() => {
    const list = (data ?? []) as BookingRow[];
    const now = new Date();
    let completed = list.filter((b) => b.status === 'completed');
    if (range === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 0 });
      completed = completed.filter((b) => parseISO(b.scheduled_at) >= start);
    } else if (range === 'month') {
      const start = startOfMonth(now);
      completed = completed.filter((b) => parseISO(b.scheduled_at) >= start);
    }

    const gross = completed.reduce((s, b) => s + b.price_cents, 0);
    const fees = completed.reduce((s, b) => s + b.platform_fee_cents, 0);
    const net = gross - fees;

    const sorted = [...completed].sort((a, b) => +parseISO(b.scheduled_at) - +parseISO(a.scheduled_at));

    return {
      available: net,
      lines: [
        { label: 'Gross bookings', value: formatCents(gross) },
        { label: 'Platform fees', value: formatCents(fees) },
        { label: 'Net (est.)', value: formatCents(net), bold: true },
      ],
      recent: sorted.slice(0, 8),
    };
  }, [data, range]);

  const onTransfer = () => {
    Alert.alert('Transfer to bank', 'Payouts are not connected in this build.');
  };

  return (
    <SafeView>
      <Text style={[textStyles.heroSerif, styles.title]}>Earnings</Text>
      <View style={styles.tabs}>
        <SegmentedTabs
          tabs={[
            { key: 'week', label: 'This week' },
            { key: 'month', label: 'Month' },
            { key: 'all', label: 'All time' },
          ]}
          value={range}
          onChange={setRange}
        />
      </View>
      {isLoading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <LinearHero amount={available} />
          <Card style={styles.card}>
            {lines.map((l) => (
              <View key={l.label} style={styles.lineRow}>
                <Text style={styles.lineLab}>{l.label}</Text>
                <Text style={[styles.lineVal, l.bold && styles.lineValBold]}>{l.value}</Text>
              </View>
            ))}
          </Card>

          <GradientButton title="Transfer to bank" icon="none" onPress={onTransfer} style={{ marginBottom: spacing.lg }} />

          <Text style={styles.section}>Recent activity</Text>
          {recent.length === 0 ? (
            <Text style={styles.muted}>No completed sessions yet.</Text>
          ) : (
            recent.map((b) => (
              <View key={b.id} style={styles.actRow}>
                <View style={styles.actIcon}>
                  <FontAwesome name="check" size={14} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actTitle}>{b.services?.type?.replace('_', ' ') ?? 'Session'}</Text>
                  <Text style={styles.actSub}>{new Date(b.scheduled_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.actAmt}>{formatCents(b.price_cents - b.platform_fee_cents)}</Text>
              </View>
            ))
          )}

          <View style={styles.promo}>
            <Text style={styles.promoTitle}>Grow with Knead</Text>
            <Text style={styles.promoSub}>Complete your profile to show up in more searches.</Text>
          </View>
        </ScrollView>
      )}
    </SafeView>
  );
}

function LinearHero({ amount }: { amount: number }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>Available for payout</Text>
      <Text style={styles.heroAmt}>{formatCents(Math.max(0, amount))}</Text>
      <Text style={styles.heroHint}>Informational — payouts not connected in MVP.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, marginBottom: spacing.sm },
  tabs: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  muted: { color: colors.stone, fontFamily: fonts.body, paddingHorizontal: spacing.lg },
  hero: {
    backgroundColor: colors.badgePink,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dustyRoseCard,
  },
  heroLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.mauve },
  heroAmt: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    color: colors.brownDark,
    marginTop: spacing.sm,
  },
  heroHint: { fontFamily: fonts.body, fontSize: 13, color: colors.stone, marginTop: spacing.xs },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineLab: { fontFamily: fonts.body, fontSize: 15, color: colors.stone },
  lineVal: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.brown },
  lineValBold: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.coralBright },
  section: {
    fontFamily: fonts.serifSemi,
    fontSize: 18,
    color: colors.brownDark,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  actIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.badgePink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.brown, textTransform: 'capitalize' },
  actSub: { fontFamily: fonts.body, fontSize: 12, color: colors.stone, marginTop: 2 },
  actAmt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown },
  promo: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  promoTitle: { fontFamily: fonts.serifSemi, fontSize: 18, color: colors.brownDark },
  promoSub: { fontFamily: fonts.body, fontSize: 14, color: colors.stone, marginTop: spacing.xs, lineHeight: 20 },
});
