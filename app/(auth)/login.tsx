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
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const SIGNIN = {
  pageBg: '#FAF9F6',
  text: '#141414',
  muted: '#575757',
  subtle: '#A29D95',
  border: '#E4D8CC',
  inputBg: '#F6F4F1',
  accent: '#F49278',
  accentText: '#FFFFFF',
  brand: '#7B1E44',
} as const;

export default function LoginScreen() {
  const router = useRouter();
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
    <SafeView style={{ backgroundColor: SIGNIN.pageBg }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.brand}>The Sanctuary</Text>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Reclaim your moment of peace.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="hello@sanctuary.com"
              placeholderTextColor={SIGNIN.subtle}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>Password</Text>
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.passwordWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={SIGNIN.subtle}
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={20} color={SIGNIN.subtle} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.signInBtn, pressed && styles.signInBtnPressed]}
              onPress={onSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Sign In">
              {loading ? <ActivityIndicator color={SIGNIN.accentText} /> : <Text style={styles.signInBtnText}>Sign In</Text>}
            </Pressable>
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR CONTINUE WITH</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              style={styles.socialBtn}
              onPress={() => Alert.alert('Google sign-in', 'Social sign-in is not configured yet.')}>
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text style={styles.socialText}>Google</Text>
            </Pressable>
            <Pressable
              style={styles.socialBtn}
              onPress={() => Alert.alert('Apple sign-in', 'Social sign-in is not configured yet.')}>
              <FontAwesome name="apple" size={18} color="#111111" />
              <Text style={styles.socialText}>Apple</Text>
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don’t have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={styles.signUpLink}>Sign Up</Text>
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
      color: SIGNIN.brand,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    headerBlock: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 66,
      lineHeight: 66,
      fontWeight: '800',
      letterSpacing: -1.4,
      textAlign: 'center',
      color: SIGNIN.text,
      marginBottom: spacing.md,
    },
    subtitle: {
      fontSize: 20,
      textAlign: 'center',
      color: SIGNIN.muted,
      lineHeight: 29,
    },
    form: {
      marginTop: spacing.md,
    },
    label: {
      fontSize: 35/2,
      color: '#433F3B',
      marginBottom: spacing.sm,
      fontWeight: '500',
    },
    input: {
      minHeight: 64,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: SIGNIN.border,
      backgroundColor: SIGNIN.inputBg,
      paddingHorizontal: spacing.md,
      color: SIGNIN.text,
      fontSize: 29/2,
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
      color: SIGNIN.accent,
      fontWeight: '700',
      fontSize: 28/2,
    },
    passwordWrap: {
      minHeight: 64,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: SIGNIN.border,
      backgroundColor: SIGNIN.inputBg,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    passwordInput: {
      flex: 1,
      fontSize: 29/2,
      color: SIGNIN.text,
    },
    signInBtn: {
      minHeight: 62,
      borderRadius: 999,
      backgroundColor: SIGNIN.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    signInBtnPressed: { opacity: 0.9 },
    signInBtnText: {
      color: SIGNIN.accentText,
      fontSize: 36/2,
      fontWeight: '700',
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
      backgroundColor: '#D8D3CC',
    },
    orText: {
      color: '#9B968F',
      fontSize: 12 * 1.15,
      letterSpacing: 0.6,
    },
    socialRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    socialBtn: {
      flex: 1,
      minHeight: 62,
      borderWidth: 1.5,
      borderColor: '#E2DDD6',
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    socialText: {
      color: '#2B2825',
      fontSize: 17,
      fontWeight: '500',
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 72,
      flexWrap: 'wrap',
    },
    footerText: {
      color: '#3C3935',
      fontSize: 35/2,
    },
    signUpLink: {
      color: SIGNIN.accent,
      fontSize: 35/2,
      fontWeight: '700',
    },
  });
}
