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
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isValidEmail } from '@/lib/validate';

export default function LoginScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase not configured',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env (use your project keys from the Supabase dashboard), then restart Expo.',
      );
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace('/');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      if (/confirm/i.test(message)) {
        Alert.alert('Email not confirmed', 'Please confirm your email to continue.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Verify email',
            onPress: () => router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim() } }),
          },
        ]);
      } else {
        Alert.alert('Sign in failed', message);
      }
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <FontAwesome name="chevron-left" size={16} color={t.text} />
          </Pressable>

          <Text style={[styles.brand, { color: t.text }]}>Knead</Text>
          <Text style={[styles.title, { color: t.text }]}>Sign in</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Welcome back. Enter your email and password.
          </Text>

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

          <View style={styles.passwordLabelRow}>
            <Text style={[styles.label, { color: t.textSecondary, marginBottom: 0 }]}>Password</Text>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable hitSlop={8} accessibilityRole="link">
                <Text style={[styles.forgotLink, { color: t.accent }]}>Forgot password?</Text>
              </Pressable>
            </Link>
          </View>

          <View style={[styles.passwordWrap, { borderColor: t.borderStrong, backgroundColor: t.inputBackground }]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={t.textTertiary}
              style={[styles.passwordInput, { color: t.text }]}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color={t.textTertiary} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: t.primary },
              pressed && styles.pressed,
            ]}
            onPress={onSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign in">
            {loading ? (
              <ActivityIndicator color={t.onPrimary} />
            ) : (
              <Text style={[styles.ctaText, { color: t.onPrimary }]}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={[styles.footerMuted, { color: t.textSecondary }]}>New here? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable accessibilityRole="link">
                <Text style={[styles.footerLink, { color: t.text }]}>Create an account</Text>
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
      marginBottom: spacing.sm,
      fontWeight: '500',
    },
    input: {
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      marginBottom: spacing.md,
    },
    passwordLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    forgotLink: {
      fontWeight: '600',
      fontSize: 13,
    },
    passwordWrap: {
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    passwordInput: {
      flex: 1,
      fontSize: 16,
      minHeight: 52,
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
