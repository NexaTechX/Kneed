import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { isValidEmail, passwordIssue } from '@/lib/validate';
import type { UserRole } from '@/types/database';

type RegisterResponse = {
  session?: { access_token: string; refresh_token: string };
  user?: { id: string; email?: string };
  error?: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  /** Same app for everyone — browse-only or posting is a choice in the product, not an account type. */
  const role = 'client' as UserRole;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    const pwIssue = passwordIssue(password);
    if (pwIssue) {
      Alert.alert('Choose a stronger password', pwIssue);
      return;
    }
    if (!agreedToTerms) {
      Alert.alert('Terms', 'Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase not configured',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env (use your project keys from the Supabase dashboard), then restart Expo.',
      );
      return;
    }
    setLoading(true);
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    try {
      // Admin create via edge function — never call auth.signUp (that path is email-rate-limited).
      const res = await fetch(`${supabaseUrl}/functions/v1/register`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          full_name: trimmedName,
        }),
      });

      let data: RegisterResponse = {};
      try {
        data = (await res.json()) as RegisterResponse;
      } catch {
        throw new Error(res.ok ? 'Unexpected signup response.' : `Sign up failed (${res.status}).`);
      }
      if (!res.ok || data.error) {
        throw new Error(data.error || `Sign up failed (${res.status}).`);
      }
      if (!data.session?.access_token || !data.session.refresh_token) {
        throw new Error('Account created but sign-in failed. Try signing in with your new password.');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (sessionError) throw sessionError;

      const uid = data.user?.id;
      if (uid) {
        const { error: pe } = await supabase
          .from('profiles')
          .update({ role, full_name: trimmedName })
          .eq('id', uid);
        if (pe) throw pe;
      }

      router.replace('/');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <FontAwesome name="chevron-left" size={16} color={t.text} />
          </Pressable>

          <Text style={[styles.brand, { color: t.text }]}>Knead</Text>
          <Text style={[styles.title, { color: t.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Enter your details to get started.
          </Text>

          <Text style={[styles.label, { color: t.textSecondary }]}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor={t.textTertiary}
            style={[styles.input, { borderColor: t.borderStrong, backgroundColor: t.inputBackground, color: t.text }]}
            autoCapitalize="words"
            autoCorrect
          />

          <Text style={[styles.label, { color: t.textSecondary }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={t.textTertiary}
            style={[styles.input, { borderColor: t.borderStrong, backgroundColor: t.inputBackground, color: t.text }]}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={[styles.label, { color: t.textSecondary }]}>Password</Text>
          <View style={[styles.passwordWrap, { borderColor: t.borderStrong, backgroundColor: t.inputBackground }]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={t.textTertiary}
              style={[styles.passwordInput, { color: t.text }]}
              secureTextEntry={!showPassword}
              autoComplete="password-new"
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color={t.textTertiary} />
            </Pressable>
          </View>

          <Pressable
            style={styles.termsRow}
            onPress={() => setAgreedToTerms((a) => !a)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: agreedToTerms ? t.accent : t.borderStrong,
                  backgroundColor: agreedToTerms ? t.accent : 'transparent',
                },
              ]}>
              {agreedToTerms ? <FontAwesome name="check" size={12} color="#FAFAFA" /> : null}
            </View>
            <Text style={[styles.termsText, { color: t.textSecondary }]}>
              I agree to the{' '}
              <Text onPress={() => router.push('/(auth)/terms')} style={[styles.termsLink, { color: t.accent }]}>
                Terms
              </Text>
              {' '}and{' '}
              <Text onPress={() => router.push('/(auth)/privacy')} style={[styles.termsLink, { color: t.accent }]}>
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          <Pressable
            onPress={onSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: t.primary },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create account">
            {loading ? (
              <ActivityIndicator color={t.onPrimary} />
            ) : (
              <Text style={[styles.ctaText, { color: t.onPrimary }]}>Create account</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={[styles.footerMuted, { color: t.textSecondary }]}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="link">
                <Text style={[styles.footerLink, { color: t.text }]}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

function createStyles() {
  return StyleSheet.create({
    flex: { flex: 1 },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    brand: {
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.3,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
      lineHeight: 34,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      marginBottom: spacing.xl,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      marginBottom: spacing.sm,
    },
    input: {
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      marginBottom: spacing.md,
    },
    passwordWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    passwordInput: {
      flex: 1,
      minHeight: 52,
      fontSize: 16,
    },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      marginTop: spacing.xs,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      marginTop: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    termsText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 21,
    },
    termsLink: {
      fontWeight: '700',
    },
    cta: {
      width: '100%',
      minHeight: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: {
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    pressed: { opacity: 0.9 },
    footerRow: {
      marginTop: spacing.xl,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 44,
      flexWrap: 'wrap',
    },
    footerMuted: { fontSize: 15 },
    footerLink: { fontSize: 15, fontWeight: '700' },
  });
}
