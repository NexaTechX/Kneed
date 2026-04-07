import { Link } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function WelcomeScreen() {
  return (
    <SafeView>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoCircle}>
          <FontAwesome name="leaf" size={36} color={colors.terracotta} />
        </View>
        <Text style={styles.brand}>Knead</Text>
        <Text style={[textStyles.heroSerif, styles.headline]}>Relief, delivered</Text>
        <Text style={[textStyles.bodyMuted, styles.sub]}>Discover the world&apos;s most calming wellness services.</Text>

        <View style={styles.heroCard}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.heroImg}
            resizeMode="contain"
          />
          <View style={styles.heroTeal}>
            <Text style={styles.heroLabel}>WELLNESS SANCTUARY</Text>
          </View>
        </View>

        {!isSupabaseConfigured ? (
          <Text style={styles.warn}>Add Supabase keys in .env to connect.</Text>
        ) : null}

        <View style={styles.actions}>
          <Link href="/(auth)/register?role=client" asChild>
            <Button title="Book a Massage" />
          </Link>
          <Link href="/(auth)/register?role=provider" asChild>
            <Button title="Offer Services" variant="secondary" />
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Text style={styles.signIn}>Sign In</Text>
          </Link>
        </View>
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  brand: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    color: colors.mauve,
    marginTop: spacing.sm,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.badgePink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headline: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  sub: {
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  heroCard: {
    width: '100%',
    marginTop: spacing.xl,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroImg: { width: 120, height: 120, opacity: 0.35 },
  heroTeal: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    width: '90%',
    alignItems: 'center',
  },
  heroLabel: {
    fontFamily: textStyles.overline.fontFamily,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.white,
    fontWeight: '700',
  },
  warn: { marginTop: spacing.md, color: colors.error, textAlign: 'center', fontSize: 13 },
  actions: { marginTop: spacing.xl, width: '100%', gap: spacing.md },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontFamily: textStyles.body.fontFamily,
    fontSize: 15,
    color: colors.stone,
  },
  signIn: {
    fontFamily: textStyles.body.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: colors.brown,
  },
});
