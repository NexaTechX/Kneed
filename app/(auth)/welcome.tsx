import type { ComponentProps } from 'react';
import { Link } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeView } from '@/components/layout/SafeView';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAppTheme } from '@/hooks/useAppTheme';

function Pillar({
  icon,
  iconColor,
  title,
  body,
  t,
}: {
  icon: ComponentProps<typeof FontAwesome>['name'];
  iconColor: string;
  title: string;
  body: string;
  t: AppTheme;
}) {
  return (
    <View style={[styles.pillar, { borderColor: t.border, backgroundColor: t.backgroundSecondary }]}>
      <View style={[styles.pillarIconWrap, { backgroundColor: t.surfaceElevated }]}>
        <FontAwesome name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.pillarText}>
        <Text style={[styles.pillarTitle, { color: t.text }]}>{title}</Text>
        <Text style={[styles.pillarBody, { color: t.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const t = useAppTheme();

  return (
    <SafeView style={[styles.root, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.bgOrbTop, { backgroundColor: t.primaryMuted }]} />
        <View style={[styles.bgOrbBottom, { backgroundColor: t.backgroundSecondary }]} />

        <View style={styles.brandWrap}>
          <LinearGradient
            colors={[t.primaryMuted, t.backgroundSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandBadge}>
            <Image source={require('@/assets/images/brand-mark.png')} style={styles.brandMark} resizeMode="contain" />
          </LinearGradient>
          <View style={styles.brandWordmark}>
            <Text style={[styles.brandName, { color: t.text }]}>Kneed</Text>
            <Text style={[styles.brandTag, { color: t.textSecondary }]}>GROW YOUR AUDIENCE · HAVE FUN · EARN ON YOUR TERMS</Text>
          </View>
        </View>

        <View style={[styles.heroImageWrap, { borderColor: t.border, backgroundColor: t.surfaceElevated, shadowColor: t.shadow }]}>
          <Image
            source={require('@/assets/images/welcome-social-hero.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.hero}>
          <View style={[styles.socialPill, { backgroundColor: t.chipBackground, borderColor: t.chipBorder }]}>
            <FontAwesome name="heart" size={12} color={t.accent} />
            <Text style={[styles.socialPillText, { color: t.textSecondary }]}>
              Social first · room to grow · clear ways to get paid
            </Text>
          </View>
          <Text style={[styles.headline, { color: t.text }]}>Build an audience, enjoy the feed, and turn your craft into income.</Text>
          <Text style={[styles.sub, { color: t.textSecondary }]}>
            Kneed is a creator-friendly social app: post photos and video, show up in a real feed, and let people who love your work
            find you again and again. Keep it light and expressive while you scale—then layer in paid posts, unlocks, or private
            bookings when the timing feels right for you.
          </Text>
        </View>

        <View style={[styles.stackCard, { borderColor: t.border, backgroundColor: t.surfaceElevated, shadowColor: t.shadow }]}>
          <Text style={[styles.stackTitle, { color: t.text }]}>Grow, connect, and get paid—without losing the social vibe</Text>
          <Pillar
            t={t}
            icon="users"
            iconColor={t.primary}
            title="Grow your reach"
            body="Stay visible in a proper social feed: consistent posting, discovery that feels natural, and profiles fans can return to as your audience grows."
          />
          <Pillar
            t={t}
            icon="bolt"
            iconColor={t.secondary}
            title="Have fun building"
            body="Share in a format people already love—quick clips, stills, captions—and keep the energy yours. Growth works best when posting still feels like you."
          />
          <Pillar
            t={t}
            icon="money"
            iconColor={t.accent}
            title="Make money with clarity"
            body="Add paid posts, unlocks, or private sessions when you choose; earnings flow through your in-app wallet with transparent fees—so monetization supports the community you’re building."
          />
        </View>

        {!isSupabaseConfigured ? (
          <View style={[styles.banner, { borderColor: '#F1D6D6', backgroundColor: t.surfaceElevated }]}>
            <Text style={styles.warn}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Link href="/(auth)/register" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.primaryCta,
                { backgroundColor: t.primary, shadowColor: t.shadow },
                pressed && styles.pressed,
              ]}>
              <Text style={styles.primaryText}>Start growing on Kneed</Text>
              <FontAwesome name="arrow-right" size={18} color="#FFFFFF" />
            </Pressable>
          </Link>

          <View style={styles.signInRow}>
            <Text style={[styles.signInMuted, { color: t.textSecondary }]}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={[styles.signInLink, { color: t.text }]}>Sign In</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.legalRow}>
            <Link href="/(auth)/terms" asChild>
              <Pressable>
                <Text style={[styles.legalLink, { color: t.textTertiary }]}>Terms</Text>
              </Pressable>
            </Link>
            <Text style={[styles.legalDot, { color: t.textTertiary }]}> · </Text>
            <Link href="/(auth)/privacy" asChild>
              <Pressable>
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
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  bgOrbTop: {
    position: 'absolute',
    top: -90,
    right: -55,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: 30,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  brandWrap: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  brandBadge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  brandMark: { width: 84, height: 84 },
  brandWordmark: { marginTop: spacing.md, alignItems: 'center', paddingHorizontal: spacing.md },
  brandName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  brandTag: {
    marginTop: 6,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroImageWrap: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    aspectRatio: 1,
    marginTop: spacing.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  hero: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  socialPillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.15, textAlign: 'center' },
  headline: {
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.9,
    maxWidth: 360,
  },
  sub: { marginTop: spacing.md, fontSize: 16, lineHeight: 24, maxWidth: 360, textAlign: 'center' },
  stackCard: {
    marginTop: spacing.xl,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.md,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  stackTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: spacing.xs,
  },
  pillar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  pillarIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarText: { flex: 1, gap: 4 },
  pillarTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  pillarBody: { fontSize: 14, lineHeight: 21 },
  banner: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1D6D6',
    backgroundColor: '#FFFFFF',
    marginTop: spacing.md,
  },
  warn: { textAlign: 'center', fontSize: 14, lineHeight: 20, color: '#B64040' },
  actions: { marginTop: spacing.xl, gap: spacing.md },
  primaryCta: {
    minHeight: 62,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryText: { color: '#FFFFFF', fontSize: 34 / 2, fontWeight: '700', letterSpacing: -0.2 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  signInRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signInMuted: { fontSize: 32 / 2 },
  signInLink: { fontSize: 32 / 2, fontWeight: '800' },
  legalRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  legalLink: { fontSize: 14, textDecorationLine: 'underline' },
  legalDot: { fontSize: 14 },
});
