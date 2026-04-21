import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ensureWalletAccount, toNaira } from '@/lib/social';

export default function WalletScreen() {
  const { user } = useAuth();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet-account', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      await ensureWalletAccount(user!.id, 'user');
      const { data, error } = await supabase.from('wallet_accounts').select('*').eq('owner_id', user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: withdrawals, refetch } = useQuery({
    queryKey: ['withdrawals', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const requestWithdrawal = async () => {
    if (!user) return;
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    if (cents <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        amount_cents: cents,
        destination: destination.trim() || 'manual payout',
      });
      if (error) throw error;
      setAmount('');
      setDestination('');
      await Promise.all([refetch(), refetchWallet()]);
    } catch (e: unknown) {
      Alert.alert('Request failed', e instanceof Error ? e.message : 'Could not create withdrawal request.');
    } finally {
      setSaving(false);
    }
  };

  const available = toNaira(Number(wallet?.available_cents ?? 0));

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Wallet" subtitle="Earnings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.balanceHero, { backgroundColor: t.primary }]}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>{available}</Text>
          <View style={styles.balanceGrid}>
            <View style={styles.balanceCell}>
              <Text style={styles.balanceMuted}>Pending</Text>
              <Text style={styles.balanceSmall}>{toNaira(Number(wallet?.pending_cents ?? 0))}</Text>
            </View>
            <View style={styles.balanceCell}>
              <Text style={styles.balanceMuted}>Lifetime</Text>
              <Text style={styles.balanceSmall}>{toNaira(Number(wallet?.lifetime_earned_cents ?? 0))}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Withdraw</Text>
        <Card style={styles.form}>
          <View style={styles.formHead}>
            <Ionicons name="arrow-up-circle-outline" size={22} color={t.text} />
            <Text style={[styles.formTitle, { color: t.text }]}>Request a payout</Text>
          </View>
          <Input placeholder="Amount (NGN)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Input placeholder="Payout destination" value={destination} onChangeText={setDestination} />
          <Button title="Submit request" onPress={() => void requestWithdrawal()} loading={saving} />
        </Card>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>History</Text>
        {(withdrawals ?? []).length === 0 ? (
          <Text style={[styles.empty, { color: t.textSecondary }]}>No withdrawal requests yet.</Text>
        ) : null}
        {(withdrawals ?? []).map((item: { id: string; amount_cents: number; status: string; admin_reason: string | null }) => (
          <Card key={item.id} style={styles.historyCard}>
            <Text style={[styles.itemTitle, { color: t.text }]}>{toNaira(item.amount_cents)}</Text>
            <Text style={[styles.meta, { color: t.textSecondary }]}>Status · {item.status}</Text>
            {item.admin_reason ? <Text style={[styles.meta, { color: t.textTertiary }]}>{item.admin_reason}</Text> : null}
          </Card>
        ))}
      </ScrollView>
    </SafeView>
  );
}

function createStyles() {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    balanceHero: {
      borderRadius: 20,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
    balanceValue: { color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: -0.8 },
    balanceGrid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    balanceCell: { flex: 1, gap: 4 },
    balanceMuted: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '500' },
    balanceSmall: { color: '#fff', fontSize: 15, fontWeight: '600' },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginLeft: 2,
    },
    form: { gap: spacing.sm },
    formHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    formTitle: { fontSize: 17, fontWeight: '600' },
    empty: { fontSize: 14, paddingVertical: spacing.sm },
    historyCard: { paddingVertical: spacing.md },
    itemTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    meta: { fontSize: 13, marginTop: 4 },
  });
}
