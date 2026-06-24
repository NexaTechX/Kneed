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
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchLatestKycApplication,
  pickAndUploadKycDocument,
  submitKycApplication,
} from '@/lib/kyc';
import { ageFromDob } from '@/lib/validate';

export default function KycScreen() {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user, profile } = useAuth();

  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [idPath, setIdPath] = useState<string | null>(null);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'id' | 'selfie' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const kycOk = profile?.is_kyc_verified === true;

  const { data: latest, refetch } = useQuery({
    queryKey: ['kyc-latest', user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchLatestKycApplication(user!.id),
  });

  const pending = latest?.status === 'pending';

  const upload = async (kind: 'id' | 'selfie') => {
    if (!user) return;
    setUploading(kind);
    try {
      const path = await pickAndUploadKycDocument(user.id, kind);
      if (path) {
        if (kind === 'id') setIdPath(path);
        else setSelfiePath(path);
      }
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload document.');
    } finally {
      setUploading(null);
    }
  };

  const onSubmit = async () => {
    if (!user) return;
    const name = legalName.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter your full legal name as it appears on your ID.');
      return;
    }
    const age = ageFromDob(dob);
    if (age === null) {
      Alert.alert('Invalid date', 'Enter your date of birth as YYYY-MM-DD.');
      return;
    }
    if (age < 18) {
      Alert.alert('Not eligible', 'You must be 18 or older to verify.');
      return;
    }
    if (!idPath) {
      Alert.alert('ID required', 'Upload a photo of your government-issued ID.');
      return;
    }
    setSubmitting(true);
    try {
      await submitKycApplication({
        userId: user.id,
        fullLegalName: name,
        dob: dob.trim(),
        idDocPath: idPath,
        selfiePath,
      });
      Alert.alert('Submitted', 'Your verification is under review. We will notify you once it is decided.');
      setLegalName('');
      setDob('');
      setIdPath(null);
      setSelfiePath(null);
      await refetch();
    } catch (e: unknown) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Identity verification" subtitle="KYC" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatusBanner t={t} kycOk={kycOk} status={latest?.status ?? null} reason={latest?.admin_reason ?? null} />

        {kycOk ? (
          <Card style={styles.card}>
            <Text style={[styles.helper, { color: t.textSecondary }]}>
              You are verified. Paid posts and Private Room are unlocked.
            </Text>
          </Card>
        ) : pending ? (
          <Card style={styles.card}>
            <Text style={[styles.helper, { color: t.textSecondary }]}>
              Your application is under review. You will be notified once a decision is made.
            </Text>
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Your details</Text>
              <Text style={[styles.helper, { color: t.textSecondary }]}>
                Must match your government-issued ID. Used only for verification.
              </Text>
              <Text style={[styles.label, { color: t.textTertiary }]}>Full legal name</Text>
              <Input value={legalName} onChangeText={setLegalName} placeholder="As on your ID" autoCapitalize="words" />
              <Text style={[styles.label, { color: t.textTertiary }]}>Date of birth</Text>
              <Input value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
            </Card>

            <Card style={styles.card}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Documents</Text>
              <Text style={[styles.helper, { color: t.textSecondary }]}>
                Photos are stored privately and visible only to our verification team.
              </Text>
              <DocRow
                t={t}
                label="Government ID"
                done={Boolean(idPath)}
                loading={uploading === 'id'}
                onPress={() => void upload('id')}
              />
              <DocRow
                t={t}
                label="Selfie (optional)"
                done={Boolean(selfiePath)}
                loading={uploading === 'selfie'}
                onPress={() => void upload('selfie')}
              />
            </Card>

            <Button title="Submit for review" loading={submitting} onPress={() => void onSubmit()} />
          </>
        )}
      </ScrollView>
    </SafeView>
  );
}

function StatusBanner({
  t,
  kycOk,
  status,
  reason,
}: {
  t: AppTheme;
  kycOk: boolean;
  status: 'pending' | 'approved' | 'rejected' | null;
  reason: string | null;
}) {
  const styles = createStyles(t);
  const effective = kycOk ? 'approved' : status;
  const color = effective === 'approved' ? t.success : effective === 'rejected' ? t.error : t.textSecondary;
  const labelText =
    effective === 'approved'
      ? 'Verified'
      : effective === 'rejected'
        ? 'Rejected'
        : effective === 'pending'
          ? 'Under review'
          : 'Not started';
  return (
    <View style={[styles.banner, { backgroundColor: `${color}14`, borderColor: t.border }]}>
      <Ionicons
        name={effective === 'approved' ? 'shield-checkmark' : effective === 'rejected' ? 'close-circle' : 'time-outline'}
        size={18}
        color={color}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerText, { color }]}>Status: {labelText}</Text>
        {effective === 'rejected' && reason ? (
          <Text style={[styles.helper, { color: t.textSecondary }]}>{reason}</Text>
        ) : null}
      </View>
    </View>
  );
}

function DocRow({
  t,
  label,
  done,
  loading,
  onPress,
}: {
  t: AppTheme;
  label: string;
  done: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const styles = createStyles(t);
  return (
    <View style={styles.docRow}>
      <View style={styles.docLeft}>
        <Ionicons name={done ? 'checkmark-circle' : 'document-outline'} size={20} color={done ? t.success : t.textTertiary} />
        <Text style={[styles.docLabel, { color: t.text }]}>{label}</Text>
      </View>
      <Button
        title={done ? 'Replace' : 'Upload'}
        variant="outline"
        loading={loading}
        onPress={onPress}
        style={styles.docBtn}
        textStyle={{ fontSize: 13 }}
      />
    </View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl + 24 },
    card: { gap: spacing.xs },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    helper: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.xs },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 14,
      padding: spacing.md,
    },
    bannerText: { fontSize: 14, fontWeight: '700' },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    docLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    docLabel: { fontSize: 15, fontWeight: '500' },
    docBtn: { paddingHorizontal: spacing.md, minHeight: 38 },
  });
}
