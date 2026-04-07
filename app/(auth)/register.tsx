import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

export default function RegisterScreen() {
  const router = useRouter();
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = useMemo(() => (roleParam === 'provider' ? 'provider' : 'client') as UserRole, [roleParam]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error('No user id');

      const { error: pe } = await supabase.from('profiles').update({ role }).eq('id', uid);
      if (pe) throw pe;

      if (role === 'provider') {
        const { error: ie } = await supabase.from('providers').insert({
          id: uid,
          license_number: '',
          years_exp: 0,
        });
        if (ie) throw ie;
      }

      router.replace('/');
    } catch (e: unknown) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView>
      <ScreenHeader title="Create account" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>You&apos;re signing up as a {role === 'provider' ? 'provider' : 'client'}.</Text>
        <Card style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Text style={styles.label}>Password</Text>
          <Input secureTextEntry value={password} onChangeText={setPassword} />
          <Button title="Continue" loading={loading} onPress={onSubmit} style={{ marginTop: spacing.lg }} />
        </Card>
        <Link href="/(auth)/login" asChild>
          <Button title="Have an account? Log in" variant="outline" style={{ marginTop: spacing.md }} />
        </Link>
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hint: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.stone,
    marginBottom: spacing.md,
  },
  card: { gap: spacing.sm },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.brown, marginTop: spacing.xs },
});
