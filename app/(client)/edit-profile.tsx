import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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
import { useAuthStore } from '@/stores/authStore';

export default function EditProfileScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user, profile } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const kycOk = profile?.is_kyc_verified === true;

  const onSave = async () => {
    if (!user) return;
    const name = fullName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: name,
        phone: phone.trim() || null,
      });
      const fresh = await fetchProfile(user.id);
      if (fresh) setProfile(fresh);
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const applyForKyc = () => {
    if (kycOk) {
      Alert.alert('Already verified', 'Your KYC is already approved.');
      return;
    }
    router.push('/(client)/kyc' as never);
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Edit Profile" subtitle="Account" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Profile details</Text>
          <Text style={[styles.helper, { color: t.textSecondary }]}>Update your account info anytime.</Text>

          <Text style={[styles.label, { color: t.textTertiary }]}>Name</Text>
          <Input value={fullName} onChangeText={setFullName} placeholder="Your name" />

          <Text style={[styles.label, { color: t.textTertiary }]}>Phone</Text>
          <Input value={phone} onChangeText={setPhone} placeholder="Optional" keyboardType="phone-pad" />

          <Button title="Save changes" loading={saving} onPress={() => void onSave()} style={{ marginTop: spacing.md }} />
        </Card>

        <Card style={styles.card}>
          <View style={styles.kycHead}>
            <Ionicons name={kycOk ? 'shield-checkmark' : 'shield-outline'} size={18} color={kycOk ? t.success : t.textSecondary} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>KYC verification</Text>
          </View>
          <Text style={[styles.helper, { color: t.textSecondary }]}>
            Verification is required for paid posts and Private Room bookings.
          </Text>
          <View style={[styles.statusPill, { backgroundColor: kycOk ? `${t.success}18` : t.surfaceMuted, borderColor: t.border }]}>
            <Text style={[styles.statusText, { color: kycOk ? t.success : t.textSecondary }]}>
              {kycOk ? 'Status: Verified' : 'Status: Not verified'}
            </Text>
          </View>
          <Button title={kycOk ? 'KYC approved' : 'Apply for KYC'} variant={kycOk ? 'outline' : 'coral'} onPress={applyForKyc} />
        </Card>
      </ScrollView>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl + 24 },
    card: { gap: spacing.xs },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    helper: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.xs },
    kycHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
    statusPill: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
    },
    statusText: { fontSize: 12, fontWeight: '600' },
  });
}
