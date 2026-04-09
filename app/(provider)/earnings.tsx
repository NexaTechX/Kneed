import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenTitle } from '@/components/layout/ScreenTitle';
import { Card } from '@/components/ui/Card';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { formatCents } from '@/lib/utils';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useProviderBookings } from '@/hooks/useBookings';

export default function ProviderEarningsScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
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
      <ScreenTitle kicker="Overview" title="Earnings" />
      {isLoading ? (
        <Text style={[styles.muted, { color: t.textSecondary }]}>Loading…</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
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
          <Text style={[styles.note, { color: t.textSecondary }]}>
            Net is informational only. Payouts and settlements are not connected yet. If a booking is marked disputed,
            amounts here may not reflect final resolution — contact support when that flow is available.
          </Text>
        </ScrollView>
      )}
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    muted: { padding: spacing.lg, fontSize: 15 },
    label: { color: t.textTertiary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    value: { fontSize: 24, fontWeight: '800', color: t.primary, marginTop: 6, letterSpacing: -0.4 },
    note: { marginTop: spacing.md, fontSize: 14, lineHeight: 21 },
  });
}
