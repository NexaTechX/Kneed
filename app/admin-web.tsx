import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenTitle } from '@/components/layout/ScreenTitle';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toNaira } from '@/lib/social';

export default function AdminWebScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();

  const { data: withdrawals, refetch } = useQuery({
    queryKey: ['admin-withdrawals'],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ['admin-reports'],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('moderation_reports').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingPosts, refetch: refetchPosts } = useQuery({
    queryKey: ['admin-pending-posts'],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_posts')
        .select('id, creator_id, title, body, price_cents, monetization_status, status, created_at')
        .eq('is_paid', true)
        .eq('monetization_status', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const approveWithdrawal = async (id: string) => {
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'approved', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      Alert.alert('Approval failed', error.message);
      return;
    }
    await refetch();
  };

  const approveMonetizedPost = async (id: string) => {
    const { error } = await supabase
      .from('creator_posts')
      .update({ monetization_status: 'approved', status: 'published' })
      .eq('id', id);
    if (error) {
      Alert.alert('Approve failed', error.message);
      return;
    }
    await refetchPosts();
  };

  const rejectMonetizedPost = async (id: string) => {
    const { error } = await supabase
      .from('creator_posts')
      .update({ monetization_status: 'rejected', status: 'rejected' })
      .eq('id', id);
    if (error) {
      Alert.alert('Reject failed', error.message);
      return;
    }
    await refetchPosts();
  };

  const rejectWithdrawal = async (id: string) => {
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        admin_reason: 'Rejected by admin review.',
      })
      .eq('id', id);
    if (error) {
      Alert.alert('Rejection failed', error.message);
      return;
    }
    await refetch();
  };

  return (
    <SafeView>
      <ScreenTitle kicker="Admin" title="Operations Web App" />
      <ScrollView contentContainerStyle={styles.content}>
        {Platform.OS !== 'web' ? (
          <Card>
            <Text style={styles.meta}>Admin tooling is designed for web usage. Open this route in web for full operations workflow.</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>Monetized posts (review)</Text>
          <Text style={styles.meta}>Approve paid posts before they appear in the public feed.</Text>
        </Card>

        {(pendingPosts ?? []).map((post) => (
          <Card key={post.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{post.title || 'Untitled'}</Text>
            <Text style={styles.meta}>{post.body?.slice(0, 120) ?? ''}</Text>
            <Text style={styles.meta}>Price: {toNaira(post.price_cents)} · Author: {post.creator_id}</Text>
            <View style={styles.actions}>
              <Button title="Approve & publish" onPress={() => void approveMonetizedPost(post.id)} />
              <Button title="Reject" variant="outline" onPress={() => void rejectMonetizedPost(post.id)} />
            </View>
          </Card>
        ))}

        <Card>
          <Text style={styles.sectionTitle}>Withdrawal approvals</Text>
          <Text style={styles.meta}>Finance can approve/reject requests. Platform keeps custodial funds until payout.</Text>
        </Card>

        {(withdrawals ?? []).map((item: { id: string; amount_cents: number; user_id?: string; creator_id?: string; status: string }) => (
          <Card key={item.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{toNaira(item.amount_cents)}</Text>
            <Text style={styles.meta}>User: {item.user_id ?? item.creator_id}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            {item.status === 'pending' ? (
              <View style={styles.actions}>
                <Button title="Approve" onPress={() => void approveWithdrawal(item.id)} />
                <Button title="Reject" variant="outline" onPress={() => void rejectWithdrawal(item.id)} />
              </View>
            ) : null}
          </Card>
        ))}

        <Card>
          <Text style={styles.sectionTitle}>Moderation queue</Text>
          <Text style={styles.meta}>Post-publication safety queue for moderators.</Text>
        </Card>

        {(reports ?? []).map((report) => (
          <Card key={report.id}>
            <Text style={styles.itemTitle}>{report.target_type} report</Text>
            <Text style={styles.meta}>Status: {report.status}</Text>
            <Text style={styles.meta}>{report.reason}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl, maxWidth: 980, width: '100%', alignSelf: 'center' },
    sectionTitle: { color: t.text, fontWeight: '800', fontSize: 17 },
    meta: { color: t.textSecondary },
    itemCard: { gap: spacing.xs },
    itemTitle: { color: t.text, fontWeight: '800' },
    actions: { marginTop: spacing.sm, gap: spacing.sm },
  });
}
