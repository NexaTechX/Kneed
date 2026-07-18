import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfile, updateProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ensureWalletAccount, toNaira } from '@/lib/social';
import { queryKeys } from '@/lib/queries';
import { useAuthStore } from '@/stores/authStore';
import type { WalletTransaction } from '@/types/database';

const MIN_WITHDRAWAL_CENTS = 100000; // NGN 1,000

const ENTRY_LABEL: Record<WalletTransaction['entry_type'], string> = {
  purchase: 'Content sale',
  tip: 'Tip',
  private_room: 'Private room',
  fee: 'Platform fee',
  refund: 'Refund',
  withdrawal: 'Withdrawal',
  adjustment: 'Adjustment',
};

export default function WalletScreen() {
  const { user, profile } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState(profile?.payout_bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(profile?.payout_account_number ?? '');
  const [accountName, setAccountName] = useState(profile?.payout_account_name ?? '');
  const [saving, setSaving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: queryKeys.walletAccount(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      await ensureWalletAccount(user!.id, 'user');
      const { data, error } = await supabase.from('wallet_accounts').select('*').eq('owner_id', user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: withdrawals, refetch } = useQuery({
    queryKey: queryKeys.withdrawals(user?.id),
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

  const { data: ledger, refetch: refetchLedger } = useQuery({
    queryKey: queryKeys.walletLedger(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WalletTransaction[];
    },
  });

  const availableCents = Number(wallet?.available_cents ?? 0);
  const hasBank = Boolean(profile?.payout_account_number?.trim());

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchWallet(), refetchLedger()]);
    } finally {
      setRefreshing(false);
    }
  };

  const saveBank = async () => {
    if (!user) return;
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      Alert.alert('Missing details', 'Enter your bank name, account number, and account name.');
      return;
    }
    setSavingBank(true);
    try {
      await updateProfile(user.id, {
        payout_bank_name: bankName.trim(),
        payout_account_number: accountNumber.trim(),
        payout_account_name: accountName.trim(),
      });
      const fresh = await fetchProfile(user.id, user.email ?? '');
      if (fresh) setProfile(fresh);
      Alert.alert('Saved', 'Your payout method was updated.');
    } catch (e: unknown) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSavingBank(false);
    }
  };

  const requestWithdrawal = async () => {
    if (!user) return;
    if (!hasBank) {
      Alert.alert('Add payout method', 'Save your bank details before requesting a payout.');
      return;
    }
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    if (cents < MIN_WITHDRAWAL_CENTS) {
      Alert.alert('Minimum payout', `The minimum withdrawal is ${toNaira(MIN_WITHDRAWAL_CENTS)}.`);
      return;
    }
    if (cents > availableCents) {
      Alert.alert('Insufficient balance', `You can withdraw up to ${toNaira(availableCents)}.`);
      return;
    }
    setSaving(true);
    try {
      const destination = `${profile?.payout_bank_name} · ${profile?.payout_account_number} · ${profile?.payout_account_name}`;
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        amount_cents: cents,
        destination,
      });
      if (error) throw error;
      setAmount('');
      await Promise.all([refetch(), refetchWallet()]);
      Alert.alert('Requested', 'Your payout request was submitted for review.');
    } catch (e: unknown) {
      Alert.alert('Request failed', e instanceof Error ? e.message : 'Could not create withdrawal request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Wallet" subtitle="Earnings" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.text} />}>
        <View style={[styles.balanceHero, { backgroundColor: t.primary }]}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>{toNaira(availableCents)}</Text>
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

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Payout method</Text>
        <Card style={styles.form}>
          <Input placeholder="Bank name" value={bankName} onChangeText={setBankName} />
          <Input placeholder="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
          <Input placeholder="Account name" value={accountName} onChangeText={setAccountName} autoCapitalize="words" />
          <Button title="Save payout method" variant="outline" onPress={() => void saveBank()} loading={savingBank} />
        </Card>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Withdraw</Text>
        <Card style={styles.form}>
          <View style={styles.formHead}>
            <Ionicons name="arrow-up-circle-outline" size={22} color={t.text} />
            <Text style={[styles.formTitle, { color: t.text }]}>Request a payout</Text>
          </View>
          <Text style={[styles.meta, { color: t.textTertiary }]}>
            Minimum {toNaira(MIN_WITHDRAWAL_CENTS)}. Paid out to your saved bank account after review.
          </Text>
          <Input placeholder="Amount (NGN)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Button title="Submit request" onPress={() => void requestWithdrawal()} loading={saving} />
        </Card>

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Transactions</Text>
        {(ledger ?? []).length === 0 ? (
          <Text style={[styles.empty, { color: t.textSecondary }]}>No transactions yet.</Text>
        ) : (
          (ledger ?? []).map((tx) => {
            const credit = tx.direction === 'credit';
            return (
              <Card key={tx.id} style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.txTitle, { color: t.text }]}>{ENTRY_LABEL[tx.entry_type] ?? tx.entry_type}</Text>
                    <Text style={[styles.meta, { color: t.textTertiary }]}>
                      {tx.status} · {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: credit ? t.success : t.text }]}>
                    {credit ? '+' : '−'}
                    {toNaira(tx.amount_cents)}
                  </Text>
                </View>
              </Card>
            );
          })
        )}

        <Text style={[styles.sectionLabel, { color: t.textTertiary }]}>Withdrawal history</Text>
        {(withdrawals ?? []).length === 0 ? (
          <Text style={[styles.empty, { color: t.textSecondary }]}>No withdrawal requests yet.</Text>
        ) : null}
        {(withdrawals ?? []).map(
          (item: { id: string; amount_cents: number; status: string; admin_reason: string | null }) => (
            <Card key={item.id} style={styles.historyCard}>
              <Text style={[styles.itemTitle, { color: t.text }]}>{toNaira(item.amount_cents)}</Text>
              <Text style={[styles.meta, { color: t.textSecondary }]}>Status · {item.status}</Text>
              {item.admin_reason ? <Text style={[styles.meta, { color: t.textTertiary }]}>{item.admin_reason}</Text> : null}
            </Card>
          ),
        )}
      </ScrollView>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
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
    txCard: { paddingVertical: spacing.md },
    txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    txTitle: { fontSize: 15, fontWeight: '600' },
    txAmount: { fontSize: 16, fontWeight: '700' },
    historyCard: { paddingVertical: spacing.md },
    itemTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    meta: { fontSize: 13, marginTop: 4 },
  });
}
