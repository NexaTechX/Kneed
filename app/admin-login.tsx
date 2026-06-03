import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function AdminLoginScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/admin-web');
  }, [isLoading, router, user]);

  const onSubmit = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase not configured', 'Set Supabase env vars and restart Expo.');
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace('/admin-web');
    } catch (e: unknown) {
      Alert.alert('Admin sign-in failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: t.text }]}>Admin sign in</Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>Use your admin account to access operations tools.</Text>

          <View style={styles.form}>
            <Text style={[styles.label, { color: t.textSecondary }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor={t.textTertiary}
              style={[styles.input, { borderColor: t.borderStrong, backgroundColor: t.inputBackground, color: t.text }]}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Text style={[styles.label, { color: t.textSecondary }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={t.textTertiary}
              style={[styles.input, { borderColor: t.borderStrong, backgroundColor: t.inputBackground, color: t.text }]}
              secureTextEntry
              autoComplete="password"
            />

            <Pressable
              style={({ pressed }) => [styles.cta, { backgroundColor: t.primary }, pressed && styles.ctaPressed]}
              onPress={onSubmit}
              disabled={submitting}
              accessibilityRole="button">
              {submitting ? <ActivityIndicator color={t.onPrimary} /> : <Text style={[styles.ctaText, { color: t.onPrimary }]}>Continue</Text>}
            </Pressable>

            <Pressable onPress={() => router.replace('/(auth)/login')} accessibilityRole="button">
              <Text style={[styles.alt, { color: t.accent }]}>Use regular sign in instead</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

function createStyles() {
  return StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
    title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
    sub: { marginTop: spacing.sm, fontSize: 15, lineHeight: 22 },
    form: { marginTop: spacing.xl, gap: spacing.sm },
    label: { fontSize: 13, fontWeight: '500' },
    input: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.md, fontSize: 16, marginBottom: spacing.sm },
    cta: { minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
    ctaPressed: { opacity: 0.92 },
    ctaText: { fontSize: 16, fontWeight: '700' },
    alt: { textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },
  });
}
