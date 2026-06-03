import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfile, recordAgeAndPolicyConsent } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

export default function AgeGateScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);

  const [isAdult, setIsAdult] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = isAdult && acceptedPolicy;

  const onContinue = async () => {
    if (!user) return;
    if (!canContinue) {
      Alert.alert('Confirmation required', 'Please confirm you are 18+ and accept the content policy.');
      return;
    }
    setLoading(true);
    try {
      await recordAgeAndPolicyConsent();
      const fresh = await fetchProfile(user.id);
      if (fresh) setProfile(fresh);
      router.replace('/(client)/(tabs)/feed');
    } catch (e: unknown) {
      Alert.alert('Could not continue', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconCircle, { backgroundColor: t.surfaceMuted }]}>
          <Ionicons name="shield-checkmark" size={30} color={t.text} />
        </View>
        <Text style={[styles.title, { color: t.text }]}>Confirm your age</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          Knead is an 18+ platform that may contain adult content. You must confirm your age and accept our content
          policy before continuing.
        </Text>

        <Card style={styles.card}>
          <CheckRow
            t={t}
            checked={isAdult}
            onToggle={() => setIsAdult((v) => !v)}
            label="I confirm that I am 18 years of age or older."
          />
          <View style={[styles.divider, { backgroundColor: t.border }]} />
          <CheckRow
            t={t}
            checked={acceptedPolicy}
            onToggle={() => setAcceptedPolicy((v) => !v)}
            label={
              <Text style={[styles.checkText, { color: t.textSecondary }]}>
                I have read and accept the{' '}
                <Text onPress={() => router.push('/(auth)/terms')} style={[styles.link, { color: t.accent }]}>
                  Terms
                </Text>{' '}
                and{' '}
                <Text onPress={() => router.push('/(auth)/privacy')} style={[styles.link, { color: t.accent }]}>
                  Content & Privacy Policy
                </Text>
                .
              </Text>
            }
          />
        </Card>

        <Button
          title="Continue"
          loading={loading}
          disabled={!canContinue}
          onPress={() => void onContinue()}
          style={{ marginTop: spacing.lg }}
        />
        <Text style={[styles.fine, { color: t.textTertiary }]}>
          Providing false information about your age violates our terms and may result in account removal.
        </Text>
      </ScrollView>
    </SafeView>
  );
}

function CheckRow({
  t,
  checked,
  onToggle,
  label,
}: {
  t: AppTheme;
  checked: boolean;
  onToggle: () => void;
  label: React.ReactNode;
}) {
  const styles = createStyles(t);
  return (
    <Pressable
      style={styles.checkRow}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}>
      <View
        style={[
          styles.checkbox,
          { borderColor: checked ? t.accent : t.borderStrong, backgroundColor: checked ? t.accent : 'transparent' },
        ]}>
        {checked ? <FontAwesome name="check" size={12} color="#FFFFFF" /> : null}
      </View>
      {typeof label === 'string' ? <Text style={[styles.checkText, { color: t.textSecondary }]}>{label}</Text> : label}
    </Pressable>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl, paddingTop: spacing.xl },
    iconCircle: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: spacing.sm },
    subtitle: { fontSize: 15, lineHeight: 22 },
    card: { gap: spacing.sm, marginTop: spacing.sm },
    divider: { height: StyleSheet.hairlineWidth },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      marginTop: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkText: { flex: 1, fontSize: 14, lineHeight: 21 },
    link: { fontWeight: '700', textDecorationLine: 'underline' },
    fine: { fontSize: 12, lineHeight: 18, marginTop: spacing.sm, textAlign: 'center' },
  });
}
