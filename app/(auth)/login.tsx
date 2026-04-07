import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
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
      <ScreenHeader title="Sign in" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Input autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Text style={styles.label}>Password</Text>
          <Input secureTextEntry value={password} onChangeText={setPassword} />
          <Button title="Sign in" loading={loading} onPress={onSubmit} style={{ marginTop: spacing.lg }} />
        </Card>
        <Link href="/(auth)/register" asChild>
          <Button title="Create account" variant="outline" style={{ marginTop: spacing.md }} />
        </Link>
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.sm },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.brown, marginTop: spacing.xs },
});
