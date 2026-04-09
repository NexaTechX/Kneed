import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase not configured', 'Add your Supabase keys in .env.');
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email required');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('/(auth)/login');
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;
      Alert.alert('Check your email', 'We sent a reset link if that address is registered.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView>
      <Header title="Reset password" showBack />
      <View style={styles.form}>
        <Text style={[styles.hint, { color: t.textSecondary }]}>
          Enter your account email. We will send a reset link.
        </Text>
        <Text style={styles.label}>Email</Text>
        <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Button title="Send reset link" loading={loading} onPress={onSubmit} style={{ marginTop: spacing.lg }} />
        <Link href="/(auth)/login" asChild>
          <Button title="Back to log in" variant="outline" style={{ marginTop: spacing.md }} />
        </Link>
      </View>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    form: { padding: spacing.lg, gap: spacing.sm },
    hint: { fontSize: 15, lineHeight: 22, marginBottom: spacing.sm },
    label: { fontSize: 13, fontWeight: '700', color: t.textSecondary, letterSpacing: 0.2, textTransform: 'uppercase' },
  });
}
