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
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeView } from '@/components/layout/SafeView';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

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
    <SafeView style={{ backgroundColor: t.background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.brand, { color: t.text }]}>Knead</Text>

          <View style={styles.headerBlock}>
            <Text style={[styles.title, { color: t.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: t.textSecondary }]}>Sign in to pick up where you left off.</Text>
          </View>

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

            <View style={styles.passwordLabelRow}>
              <Text style={[styles.label, { color: t.textSecondary }]}>Password</Text>
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable>
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
                <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={20} color={t.textTertiary} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.signInBtn,
                { backgroundColor: t.primary, shadowColor: t.shadow },
                pressed && styles.signInBtnPressed,
              ]}
              onPress={onSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Sign In">
              {loading ? <ActivityIndicator color={t.onPrimary} /> : <Text style={[styles.signInBtnText, { color: t.onPrimary }]}>Sign in</Text>}
            </Pressable>
          </View>

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: t.border }]} />
            <Text style={[styles.orText, { color: t.textTertiary }]}>OR CONTINUE WITH</Text>
            <View style={[styles.orLine, { backgroundColor: t.border }]} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              style={[styles.socialBtn, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}
              onPress={() => Alert.alert('Google sign-in', 'Social sign-in is not configured yet.')}>
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text style={[styles.socialText, { color: t.text }]}>Google</Text>
            </Pressable>
            <Pressable
              style={[styles.socialBtn, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}
              onPress={() => Alert.alert('Apple sign-in', 'Social sign-in is not configured yet.')}>
              <FontAwesome name="apple" size={18} color={t.text} />
              <Text style={[styles.socialText, { color: t.text }]}>Apple</Text>
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: t.textSecondary }]}>New here? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={[styles.signUpLink, { color: t.accent }]}>Create an account</Text>
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
    brand: {
      textAlign: 'center',
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.4,
      marginBottom: spacing.md,
    },
    headerBlock: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '700',
      letterSpacing: -0.9,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 320,
    },
    form: {
      marginTop: spacing.md,
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
      marginBottom: spacing.lg,
    },
    passwordLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
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
    },
    signInBtn: {
      minHeight: 52,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    signInBtnPressed: { opacity: 0.92 },
    signInBtnText: {
      fontSize: 16,
      fontWeight: '600',
    },
    orRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xxl,
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    orLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
    },
    orText: {
      fontSize: 11,
      letterSpacing: 1.2,
      fontWeight: '600',
    },
    socialRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    socialBtn: {
      flex: 1,
      minHeight: 52,
      borderWidth: 1,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    socialText: {
      fontSize: 15,
      fontWeight: '600',
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 72,
      flexWrap: 'wrap',
    },
    footerText: {
      fontSize: 15,
    },
    signUpLink: {
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
