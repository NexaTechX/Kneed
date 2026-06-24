import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { email: rawEmail } = useLocalSearchParams<{ email?: string }>();
  const email = typeof rawEmail === 'string' ? rawEmail : '';
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const resend = async () => {
    if (!email) {
      Alert.alert('Email needed', 'Open this screen from sign up to resend.');
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      Alert.alert('Sent', 'We sent another confirmation email.');
    } catch (e: unknown) {
      Alert.alert('Could not resend', e instanceof Error ? e.message : 'Try again shortly.');
    } finally {
      setResending(false);
    }
  };

  const checkConfirmed = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data.user?.email_confirmed_at) {
        router.replace('/');
      } else {
        Alert.alert('Not yet', 'We could not confirm your email yet. Tap the link in your inbox, then try again.');
      }
    } catch {
      Alert.alert('Not yet', 'Confirm your email from the link we sent, then try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <Header title="Verify email" showBack />
      <View style={styles.wrap}>
        <View style={[styles.iconCircle, { backgroundColor: t.surfaceMuted }]}>
          <Ionicons name="mail-unread-outline" size={30} color={t.text} />
        </View>
        <Text style={[styles.title, { color: t.text }]}>Confirm your email</Text>
        <Text style={[styles.body, { color: t.textSecondary }]}>
          We sent a confirmation link{email ? ` to ${email}` : ''}. Tap it to activate your account, then come back here.
        </Text>
        <Button title="I've confirmed — continue" loading={checking} onPress={() => void checkConfirmed()} />
        <Button title="Resend email" variant="outline" loading={resending} onPress={() => void resend()} />
      </View>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    wrap: { padding: spacing.lg, gap: spacing.md, alignItems: 'stretch' },
    iconCircle: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: spacing.lg },
    title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
    body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: spacing.sm },
  });
}
