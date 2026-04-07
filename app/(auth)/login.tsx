import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace('/');
    } catch (e: unknown) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView>
      <Header title="Log in" showBack />
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Password</Text>
        <Input secureTextEntry value={password} onChangeText={setPassword} />
        <Button title="Sign in" loading={loading} onPress={onSubmit} style={{ marginTop: spacing.lg }} />
        <Link href="/(auth)/register" asChild>
          <Button title="Create account" variant="outline" style={{ marginTop: spacing.md }} />
        </Link>
      </View>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.charcoal },
});
