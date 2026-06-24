import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenTitle } from '@/components/layout/ScreenTitle';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { signedKycUrl } from '@/lib/kyc';
import { toNaira } from '@/lib/social';
import type {
  CreatorPost,
  KycApplication,
  ModerationReport,
  ModerationReportStatus,
  WithdrawalRequest,
} from '@/types/database';

type AdminRole = 'support' | 'moderator' | 'finance' | 'super_admin';

type PendingMonetizedPost = Pick<
  CreatorPost,
  'id' | 'creator_id' | 'title' | 'body' | 'price_cents' | 'monetization_status' | 'status' | 'created_at'
>;

export default function AdminWebScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user, isLoading: authLoading } = useAuth();
  const { data: adminRole, isLoading: adminRoleLoading } = useQuery<AdminRole | null>({
    queryKey: ['admin-role-check', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_roles').select('role').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
  });

  const { data: withdrawals, refetch } = useQuery<WithdrawalRequest[]>({
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
  const canModerate = adminRole === 'moderator' || adminRole === 'super_admin';
  const canApproveWithdrawals = adminRole === 'finance' || adminRole === 'super_admin';
  const canReviewKyc = adminRole === 'support' || adminRole === 'super_admin';

  const { data: kycApps, refetch: refetchKyc } = useQuery<KycApplication[]>({
    queryKey: ['admin-kyc'],
    enabled: Boolean(user) && canReviewKyc,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kyc_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reports, refetch: refetchReports } = useQuery<ModerationReport[]>({
    queryKey: ['admin-reports'],
    enabled: Boolean(user) && canModerate,
    queryFn: async () => {
      const { data, error } = await supabase.from('moderation_reports').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingPosts, refetch: refetchPosts } = useQuery<PendingMonetizedPost[]>({
    queryKey: ['admin-pending-posts'],
    enabled: Boolean(user) && canModerate,
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

  // Resolve display names for the UUIDs shown across the queues.
  const referencedIds = useMemo(() => {
    const s = new Set<string>();
    (pendingPosts ?? []).forEach((p) => s.add(p.creator_id));
    (withdrawals ?? []).forEach((w) => s.add(w.user_id));
    (reports ?? []).forEach((r) => {
      if (r.target_type === 'profile') s.add(r.target_id);
    });
    return [...s].sort();
  }, [pendingPosts, withdrawals, reports]);

  const { data: nameMap } = useQuery<Record<string, string>>({
    queryKey: ['admin-names', referencedIds],
    enabled: referencedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name').in('id', referencedIds);
      if (error) throw error;
      const m: Record<string, string> = {};
      for (const p of data ?? []) m[p.id] = (p.full_name as string) ?? '';
      return m;
    },
  });

  const nameFor = (id: string) => nameMap?.[id]?.trim() || `${id.slice(0, 8)}…`;

  const approveWithdrawal = async (id: string) => {
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'approved', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending'); // idempotent: no-op if already actioned
    if (error) {
      Alert.alert('Approval failed', error.message);
      return;
    }
    await refetch();
  };

  const markWithdrawalPaid = async (id: string) => {
    const reference =
      typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt('Payout reference (bank/Paystack transfer id)')
        : '';
    if (!reference || !reference.trim()) return;
    const { error } = await supabase.rpc('admin_mark_withdrawal_paid', { p_id: id, p_reference: reference.trim() });
    if (error) {
      Alert.alert('Mark paid failed', error.message);
      return;
    }
    await refetch();
  };

  const approveMonetizedPost = async (id: string) => {
    const { error } = await supabase.rpc('admin_review_monetization', { p_post_id: id, p_approve: true, p_reason: null });
    if (error) {
      Alert.alert('Approve failed', error.message);
      return;
    }
    await refetchPosts();
  };

  const rejectMonetizedPost = async (id: string) => {
    const reason =
      typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt('Reason for rejection (shown to the creator)')
        : '';
    if (reason === null) return; // cancelled
    const { error } = await supabase.rpc('admin_review_monetization', {
      p_post_id: id,
      p_approve: false,
      p_reason: reason?.trim() || 'Did not meet content guidelines.',
    });
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

  const viewKycDoc = async (path: string) => {
    const url = await signedKycUrl(path);
    if (!url) {
      Alert.alert('Unavailable', 'Could not generate a document link.');
      return;
    }
    void Linking.openURL(url);
  };

  const reviewKyc = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc('admin_review_kyc', {
      p_application_id: id,
      p_approve: approve,
      p_reason: approve ? null : 'Did not meet verification requirements.',
    });
    if (error) {
      Alert.alert(approve ? 'Approve failed' : 'Reject failed', error.message);
      return;
    }
    await refetchKyc();
  };

  const removeReportedPost = async (postId: string) => {
    const { error } = await supabase.rpc('admin_remove_post', {
      p_post_id: postId,
      p_reason: 'Removed after moderation review.',
    });
    if (error) {
      Alert.alert('Remove failed', error.message);
      return;
    }
    Alert.alert('Removed', 'The post is no longer visible in the feed.');
    await refetchReports();
  };

  const suspendReportedUser = async (userId: string) => {
    const { error } = await supabase.rpc('admin_set_account_status', {
      p_user_id: userId,
      p_status: 'suspended',
      p_reason: 'Suspended after moderation review.',
    });
    if (error) {
      Alert.alert('Suspend failed', error.message);
      return;
    }
    Alert.alert('Suspended', 'The account has been suspended.');
    await refetchReports();
  };

  const setModerationStatus = async (id: string, status: ModerationReportStatus) => {
    const { error } = await supabase.from('moderation_reports').update({ status }).eq('id', id);
    if (error) {
      Alert.alert('Update failed', error.message);
      return;
    }
    const { error: auditError } = await supabase.from('admin_audit_logs').insert({
      actor_id: user?.id,
      action: 'moderation_report_status_update',
      target_type: 'moderation_report',
      target_id: id,
      details: { status },
    });
    if (auditError) {
      Alert.alert('Audit log failed', auditError.message);
    }
    await refetchReports();
  };

  const openReports = (reports ?? []).filter((report) => report.status === 'open' || report.status === 'reviewing');
  if (authLoading) {
    return (
      <SafeView>
        <ScreenTitle kicker="Admin" title="Operations Web App" />
        <View style={styles.loadingWrap}>
          <Text style={styles.meta}>Loading your session...</Text>
        </View>
      </SafeView>
    );
  }
  if (!user) return <Redirect href="/admin-login" />;
  if (adminRoleLoading) {
    return (
      <SafeView>
        <ScreenTitle kicker="Admin" title="Operations Web App" />
        <View style={styles.loadingWrap}>
          <Text style={styles.meta}>Checking admin access...</Text>
        </View>
      </SafeView>
    );
  }
  if (!adminRole) return <Redirect href="/(client)/(tabs)/feed" />;

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
          <Text style={styles.sectionTitle}>KYC verification (review)</Text>
          <Text style={styles.meta}>Approve identity verification to unlock paid posts and Private Room.</Text>
        </Card>

        {!canReviewKyc ? (
          <Card>
            <Text style={styles.meta}>Only support and super admins can review KYC applications.</Text>
          </Card>
        ) : null}

        {canReviewKyc
          ? (kycApps ?? []).map((app) => (
              <Card key={app.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{app.full_legal_name}</Text>
                <Text style={styles.meta}>DOB: {app.dob} · User: {app.user_id}</Text>
                <View style={styles.actions}>
                  <Button title="View ID document" variant="outline" onPress={() => void viewKycDoc(app.id_doc_path)} />
                  {app.selfie_path ? (
                    <Button title="View selfie" variant="outline" onPress={() => void viewKycDoc(app.selfie_path!)} />
                  ) : null}
                  <Button title="Approve" onPress={() => void reviewKyc(app.id, true)} />
                  <Button title="Reject" variant="outline" onPress={() => void reviewKyc(app.id, false)} />
                </View>
              </Card>
            ))
          : null}

        <Card>
          <Text style={styles.sectionTitle}>Monetized posts (review)</Text>
          <Text style={styles.meta}>Approve paid posts before they appear in the public feed.</Text>
        </Card>

        {!canModerate ? (
          <Card>
            <Text style={styles.meta}>Only moderators and super admins can review paid posts.</Text>
          </Card>
        ) : null}

        {(pendingPosts ?? []).map((post) => (
          <Card key={post.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{post.title || 'Untitled'}</Text>
            <Text style={styles.meta}>{post.body?.slice(0, 120) ?? ''}</Text>
            <Text style={styles.meta}>Price: {toNaira(post.price_cents)} · Author: {nameFor(post.creator_id)}</Text>
            {canModerate ? (
              <View style={styles.actions}>
                <Button title="Approve & publish" onPress={() => void approveMonetizedPost(post.id)} />
                <Button title="Reject" variant="outline" onPress={() => void rejectMonetizedPost(post.id)} />
              </View>
            ) : null}
          </Card>
        ))}

        <Card>
          <Text style={styles.sectionTitle}>Withdrawal approvals</Text>
          <Text style={styles.meta}>Finance can approve/reject requests. Platform keeps custodial funds until payout.</Text>
        </Card>

        {(withdrawals ?? []).map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{toNaira(item.amount_cents)}</Text>
            <Text style={styles.meta}>User: {nameFor(item.user_id)}</Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            {item.destination ? <Text style={styles.meta}>To: {item.destination}</Text> : null}
            {canApproveWithdrawals ? (
              <View style={styles.actions}>
                {item.status === 'pending' ? (
                  <>
                    <Button title="Approve" onPress={() => void approveWithdrawal(item.id)} />
                    <Button title="Reject" variant="outline" onPress={() => void rejectWithdrawal(item.id)} />
                  </>
                ) : null}
                {item.status === 'approved' ? (
                  <Button title="Mark paid" onPress={() => void markWithdrawalPaid(item.id)} />
                ) : null}
              </View>
            ) : null}
          </Card>
        ))}

        <Card>
          <Text style={styles.sectionTitle}>Moderation queue</Text>
          <Text style={styles.meta}>Post-publication safety queue for moderators.</Text>
        </Card>

        {!canModerate ? (
          <Card>
            <Text style={styles.meta}>Only moderators and super admins can handle moderation reports.</Text>
          </Card>
        ) : null}

        {openReports.map((report) => (
          <Card key={report.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{report.target_type} report</Text>
            <Text style={styles.meta}>Status: {report.status}</Text>
            <Text style={styles.meta}>
              Target: {report.target_type === 'profile' ? nameFor(report.target_id) : report.target_id}
            </Text>
            <Text style={styles.meta}>{report.reason}</Text>
            {report.details ? <Text style={styles.meta}>{report.details}</Text> : null}
            {canModerate ? (
              <View style={styles.actions}>
                {report.target_type === 'post' ? (
                  <Button title="Remove post" onPress={() => void removeReportedPost(report.target_id)} />
                ) : null}
                {report.target_type === 'profile' ? (
                  <Button title="Suspend user" onPress={() => void suspendReportedUser(report.target_id)} />
                ) : null}
                {report.status === 'open' ? (
                  <Button title="Mark reviewing" variant="outline" onPress={() => void setModerationStatus(report.id, 'reviewing')} />
                ) : null}
                <Button title="Resolve" onPress={() => void setModerationStatus(report.id, 'resolved')} />
                <Button title="Dismiss" variant="outline" onPress={() => void setModerationStatus(report.id, 'dismissed')} />
              </View>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl, maxWidth: 980, width: '100%', alignSelf: 'center' },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { color: t.text, fontWeight: '800', fontSize: 17 },
    meta: { color: t.textSecondary },
    itemCard: { gap: spacing.xs },
    itemTitle: { color: t.text, fontWeight: '800' },
    actions: { marginTop: spacing.sm, gap: spacing.sm },
  });
}
