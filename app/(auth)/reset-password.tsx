import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // The recovery link establishes a session; confirm one is present before allowing a change.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (active) setHasSession(Boolean(data.session));
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async () => {
    if (password.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Both passwords must match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password updated', 'You can now use your new password.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (e: unknown) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Open the reset link from your email again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <Header title="New password" showBack />
      <View style={styles.form}>
        {hasSession === false ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            Open the password reset link from your email on this device to set a new password.
          </Text>
        ) : (
          <>
            <Text style={[styles.hint, { color: t.textSecondary }]}>Choose a new password for your account.</Text>
            <Text style={styles.label}>New password</Text>
            <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />
            <Text style={styles.label}>Confirm password</Text>
            <Input value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Re-enter password" />
            <Button title="Update password" loading={loading} onPress={() => void onSubmit()} style={{ marginTop: spacing.lg }} />
          </>
        )}
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
