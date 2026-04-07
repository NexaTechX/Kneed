import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Card } from '@/components/ui/Card';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { formatCents } from '@/lib/utils';
import { useProviderBookings } from '@/hooks/useBookings';
export default function ProviderEarningsScreen() {
  const { data, isLoading } = useProviderBookings();

  const totals = useMemo(() => {
    const list = data ?? [];
    const completed = list.filter((b) => b.status === 'completed');
    const gross = completed.reduce((s, b) => s + b.price_cents, 0);
    const fees = completed.reduce((s, b) => s + b.platform_fee_cents, 0);
    return { count: completed.length, gross, fees, net: gross - fees };
  }, [data]);

  return (
    <SafeView>
      <Text style={styles.title}>Earnings</Text>
      {isLoading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Card>
            <Text style={styles.label}>Completed sessions</Text>
            <Text style={styles.value}>{totals.count}</Text>
            <Text style={[styles.label, { marginTop: spacing.md }]}>Gross (service)</Text>
            <Text style={styles.value}>{formatCents(totals.gross)}</Text>
            <Text style={[styles.label, { marginTop: spacing.md }]}>Platform fees</Text>
            <Text style={styles.value}>{formatCents(totals.fees)}</Text>
            <Text style={[styles.label, { marginTop: spacing.md }]}>Estimated net</Text>
            <Text style={styles.value}>{formatCents(totals.net)}</Text>
          </Card>
          <Text style={styles.note}>Net is informational (payouts not connected in MVP).</Text>
        </ScrollView>
      )}
    </SafeView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.charcoal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  muted: { color: colors.stone, padding: spacing.lg },
  label: { color: colors.stone, fontSize: 13 },
  value: { fontSize: 22, fontWeight: '800', color: colors.coral, marginTop: 4 },
  note: { marginTop: spacing.md, color: colors.stone, fontSize: 13 },
});
