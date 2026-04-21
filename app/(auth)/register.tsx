import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import type { UserRole } from '@/types/database';

/** Signup screen palette fixed to the provided light design. */
const SIGNUP = {
  pageBgLight: '#FAF9F6',
  cardBg: '#FFFFFF',
  inputBgLight: '#F5F5F5',
  featureBeige: '#F3EDE6',
  text: '#141414',
  textTertiary: '#A29D95',
  border: '#E8E3DC',
  borderStrong: '#D7D1C8',
  shadow: 'rgba(12, 10, 8, 0.08)',
  accent: '#A0522D',
  gradientStart: '#FF9E7D',
  gradientEnd: '#FF8B6A',
  bodyMuted: '#4A4A4A',
} as const;

export default function RegisterScreen() {
  const router = useRouter();
  const styles = useMemo(() => createStyles(), []);
  /** Same app for everyone — browse-only or posting is a choice in the product, not an account type. */
  const role = 'client' as UserRole;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageBg = SIGNUP.pageBgLight;
  const inputBg = SIGNUP.inputBgLight;
  const cardBg = SIGNUP.cardBg;
  const accent = SIGNUP.accent;
  const text = SIGNUP.text;
  const muted = SIGNUP.bodyMuted;
  const tertiary = SIGNUP.textTertiary;
  const border = SIGNUP.border;
  const borderStrong = SIGNUP.borderStrong;

  const onSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error('No user id');

      const { error: pe } = await supabase
        .from('profiles')
        .update({ role, full_name: fullName.trim() })
        .eq('id', uid);
      if (pe) throw pe;

      router.replace('/');
    } catch (e: unknown) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView style={{ backgroundColor: pageBg }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: cardBg, borderColor: border }]}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <FontAwesome name="chevron-left" size={18} color={text} />
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, shadowColor: SIGNUP.shadow }]}>
            <FieldLabel color={muted}>Full name</FieldLabel>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Evelyn Thorne"
              placeholderTextColor={tertiary}
              style={[styles.input, { backgroundColor: inputBg, color: text }]}
              autoCapitalize="words"
              autoCorrect
            />

            <FieldLabel color={muted}>Email</FieldLabel>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="hello@example.com"
              placeholderTextColor={tertiary}
              style={[styles.input, { backgroundColor: inputBg, color: text }]}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <FieldLabel color={muted}>Password</FieldLabel>
            <View style={[styles.passwordWrap, { backgroundColor: inputBg }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={tertiary}
                style={[styles.passwordInput, { color: text }]}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color={tertiary} />
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
                  { borderColor: agreedToTerms ? accent : borderStrong, backgroundColor: agreedToTerms ? accent : 'transparent' },
                ]}>
                {agreedToTerms ? <FontAwesome name="check" size={12} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.termsText, { color: muted }]}>
                I agree to the{' '}
                <Text onPress={() => router.push('/(auth)/terms')} style={[styles.termsLink, { color: accent }]}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text onPress={() => router.push('/(auth)/privacy')} style={[styles.termsLink, { color: accent }]}>
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>

            <LinearGradient
              colors={[SIGNUP.gradientStart, SIGNUP.gradientEnd]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}>
              <Pressable
                onPress={onSubmit}
                disabled={loading}
                style={({ pressed }) => [styles.ctaInner, pressed && styles.ctaPressed]}
                accessibilityRole="button"
                accessibilityLabel="Create account">
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>Create Account</Text>
                    <FontAwesome name="arrow-right" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </LinearGradient>

            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.signInRow}>
                <Text style={[styles.signInMuted, { color: muted }]}>Already have an account? </Text>
                <Text style={[styles.signInLink, { color: accent }]}>Sign In</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.orBlock}>
            <View style={[styles.orLine, { backgroundColor: border }]} />
            <Text style={[styles.orLabel, { color: tertiary }]}>OR JOIN WITH</Text>
            <View style={[styles.orLine, { backgroundColor: border }]} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              style={[styles.socialBtn, { backgroundColor: inputBg, borderColor: border }]}
              onPress={() => Alert.alert('Google sign-in', 'Social sign-in is not configured yet.')}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google">
              <Ionicons name="logo-google" size={22} color="#4285F4" />
            </Pressable>
            <Pressable
              style={[styles.socialBtn, { backgroundColor: inputBg, borderColor: border }]}
              onPress={() => Alert.alert('Facebook sign-in', 'Social sign-in is not configured yet.')}
              accessibilityRole="button"
              accessibilityLabel="Continue with Facebook">
              <Ionicons name="logo-facebook" size={22} color="#1877F2" />
            </Pressable>
          </View>

          <View style={styles.bottomBlock}>
            <Text style={[styles.kicker, { color: accent }]}>WELCOME TO KNEAD</Text>
            <Text style={[styles.heroTitle, { color: text }]}>Create your account</Text>
            <Text style={[styles.heroBody, { color: muted }]}>
              Share free posts, add pay-to-unlock when you are ready, and use Private Room after verification.
            </Text>

            <View style={[styles.featureCard, { backgroundColor: SIGNUP.featureBeige }]}>
              <FontAwesome name="leaf" size={20} color={accent} />
              <Text style={[styles.featureTitle, { color: text }]}>Creator earnings</Text>
              <Text style={[styles.featureDesc, { color: muted }]}>
                Transparent splits: 40% platform on paid posts, 10% on private-room bookings.
              </Text>
            </View>

            <View style={[styles.featureCard, styles.featureCardWhite, { backgroundColor: cardBg, borderColor: border }]}>
              <FontAwesome name="magic" size={20} color={accent} />
              <Text style={[styles.featureTitle, { color: text }]}>Safety & review</Text>
              <Text style={[styles.featureDesc, { color: muted }]}>
                Paid feed posts are reviewed before they go live. Private rooms stay KYC-gated.
              </Text>
            </View>

            <View style={styles.proofRow}>
              <View style={styles.avatars}>
                <View style={[styles.avatar, styles.avatar1]} />
                <View style={[styles.avatar, styles.avatar2]} />
                <View style={[styles.avatar, styles.avatar3]} />
              </View>
              <Text style={[styles.proofText, { color: muted }]}>Welcome — set up your profile in a minute.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

function FieldLabel({ children, color }: { children: string; color: string }) {
  return <Text style={[fieldLabelStyles.label, { color }]}>{children}</Text>;
}

const fieldLabelStyles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
});

function createStyles() {
  return StyleSheet.create({
    flex: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    topBar: {
      marginBottom: spacing.md,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      borderRadius: 22,
      padding: spacing.lg,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 6,
    },
    input: {
      minHeight: 52,
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      marginBottom: spacing.md,
    },
    passwordWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      paddingRight: spacing.md,
      marginBottom: spacing.md,
    },
    passwordInput: {
      flex: 1,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      fontSize: 16,
    },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      marginTop: 2,
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
      textDecorationLine: 'underline',
    },
    ctaGradient: {
      borderRadius: 999,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    ctaInner: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    ctaPressed: { opacity: 0.92 },
    ctaText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    signInRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    signInMuted: {
      fontSize: 15,
    },
    signInLink: {
      fontSize: 15,
      fontWeight: '700',
    },
    orBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    orLine: { flex: 1, height: StyleSheet.hairlineWidth },
    orLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
    },
    socialRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    socialBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomBlock: {
      marginTop: spacing.xxl,
    },
    kicker: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.4,
      marginBottom: spacing.sm,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.8,
      marginBottom: spacing.md,
    },
    heroBody: {
      fontSize: 16,
      lineHeight: 24,
      marginBottom: spacing.xl,
    },
    featureCard: {
      borderRadius: 18,
      padding: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.xs,
    },
    featureCardWhite: {
      borderWidth: StyleSheet.hairlineWidth,
    },
    featureTitle: {
      fontSize: 17,
      fontWeight: '800',
      marginTop: spacing.xs,
    },
    featureDesc: {
      fontSize: 14,
      lineHeight: 21,
    },
    proofRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    avatars: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      marginLeft: -10,
    },
    avatar1: {
      marginLeft: 0,
      backgroundColor: '#C4A484',
    },
    avatar2: {
      backgroundColor: '#8B7355',
    },
    avatar3: {
      backgroundColor: '#5C4A3A',
    },
    proofText: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
  });
}
