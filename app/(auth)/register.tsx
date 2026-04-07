import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
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
      <Header title="Create account" showBack />
      <Text style={styles.hint}>Registering as {role}</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Password</Text>
        <Input secureTextEntry value={password} onChangeText={setPassword} />
        <Button title="Sign up" loading={loading} onPress={onSubmit} style={{ marginTop: spacing.lg }} />
        <Link href="/(auth)/login" asChild>
          <Button title="Have an account? Log in" variant="outline" style={{ marginTop: spacing.md }} />
        </Link>
      </View>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  hint: { paddingHorizontal: spacing.lg, color: colors.stone },
  form: { padding: spacing.lg, gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.charcoal },
});
