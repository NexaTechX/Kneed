import { Link } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { spacing } from '@/constants/spacing';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function WelcomeScreen() {
  const t = useAppTheme();
  const { width } = useWindowDimensions();

  return (
    <SafeView style={[styles.root, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Image
            source={require('@/assets/images/brand-mark.png')}
            style={styles.brandMark}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={[styles.brandName, { color: t.text }]} accessibilityRole="header">
            Knead
          </Text>
          <Text style={[styles.headline, { color: t.text }]}>
            A social home for creators who grow—and get paid.
          </Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            Post photos and video, build an audience, and monetize when you’re ready.
          </Text>
        </View>

        <Image
          source={require('@/assets/images/welcome-social-hero.png')}
          style={[styles.heroImage, { width, marginLeft: -spacing.lg }]}
          resizeMode="cover"
          accessibilityLabel="Creators sharing work on Knead"
        />

        {!isSupabaseConfigured ? (
          <View style={[styles.banner, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}>
            <Text style={[styles.warn, { color: t.error }]}>
              Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Link href="/(auth)/register" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.primaryCta,
                { backgroundColor: '#000000' },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Get started">
              <Text style={[styles.primaryText, { color: '#FFFFFF' }]}>Get started</Text>
            </Pressable>
          </Link>

          <View style={styles.signInRow}>
            <Text style={[styles.signInMuted, { color: t.textSecondary }]}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Sign in">
                <Text style={[styles.signInLink, { color: t.text }]}>Sign in</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.legalRow}>
            <Link href="/(auth)/terms" asChild>
              <Pressable accessibilityRole="link">
                <Text style={[styles.legalLink, { color: t.textTertiary }]}>Terms</Text>
              </Pressable>
            </Link>
            <Text style={[styles.legalDot, { color: t.textTertiary }]}> · </Text>
            <Link href="/(auth)/privacy" asChild>
              <Pressable accessibilityRole="link">
                <Text style={[styles.legalLink, { color: t.textTertiary }]}>Privacy</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  top: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandMark: {
    width: 56,
    height: 56,
  },
  brandName: {
    marginTop: spacing.md,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  headline: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.4,
    maxWidth: 320,
  },
  sub: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 300,
    textAlign: 'center',
  },
  heroImage: {
    height: 280,
    marginBottom: spacing.xl,
  },
  banner: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  warn: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryCta: {
    width: '100%',
    alignSelf: 'center',
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: { opacity: 0.9 },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  signInMuted: { fontSize: 15 },
  signInLink: { fontSize: 15, fontWeight: '700' },
  legalRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  legalLink: { fontSize: 13 },
  legalDot: { fontSize: 13 },
});
