import { Link } from 'expo-router';
import { StyleSheet, Text, View, Pressable, Image, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { spacing } from '@/constants/spacing';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function WelcomeScreen() {
  const showcaseImage =
    'file:///C:/Users/shine/.cursor/projects/c-Users-shine-Desktop-KNEED/assets/c__Users_shine_AppData_Roaming_Cursor_User_workspaceStorage_58ef99ee9dda944007ce2791837d8137_images_image-80361e19-8847-4e20-9bf1-6dfae389d1db.png';

  return (
    <SafeView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbBottom} />

        <View style={styles.brandWrap}>
          <View style={styles.brandBadge}>
            <FontAwesome name="leaf" size={22} color="#7A2B17" />
          </View>
          <Text style={styles.brandName}>Knead</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>Relief, delivered</Text>
          <Text style={styles.sub}>Discover the world's most calming wellness services.</Text>
        </View>

        <View style={styles.previewWrap}>
          <Image source={{ uri: showcaseImage }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewOverlay} />
        </View>

        {!isSupabaseConfigured ? (
          <View style={styles.banner}>
            <Text style={styles.warn}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Link href="/(auth)/register?role=client" asChild>
            <Pressable style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>Book a Massage</Text>
              <FontAwesome name="arrow-right" size={18} color="#FFFFFF" />
            </Pressable>
          </Link>

          <Link href="/(auth)/register?role=provider" asChild>
            <Pressable style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>Offer Services</Text>
            </Pressable>
          </Link>

          <View style={styles.signInRow}>
            <Text style={styles.signInMuted}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.signInLink}>Sign In</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.legalRow}>
            <Link href="/(auth)/terms" asChild>
              <Pressable>
                <Text style={styles.legalLink}>Terms</Text>
              </Pressable>
            </Link>
            <Text style={styles.legalDot}> · </Text>
            <Link href="/(auth)/privacy" asChild>
              <Pressable>
                <Text style={styles.legalLink}>Privacy</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF9F6' },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  bgOrbTop: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 168, 142, 0.17)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: 60,
    left: -70,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(197, 133, 110, 0.1)',
  },
  brandWrap: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
  brandBadge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#F89473',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { marginTop: spacing.md, fontSize: 47 / 2, fontWeight: '800', color: '#5A4250', letterSpacing: -0.4 },
  hero: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  headline: {
    color: '#141414',
    textAlign: 'center',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  sub: { marginTop: spacing.md, fontSize: 17, lineHeight: 26, maxWidth: 320, textAlign: 'center', color: '#4F4B46' },
  previewWrap: {
    marginTop: spacing.xl,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7DED4',
    shadowColor: 'rgba(45, 36, 29, 0.16)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1.68,
    backgroundColor: '#EAE5DE',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
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
    backgroundColor: '#9C452E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: 'rgba(37, 20, 14, 0.2)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryText: { color: '#FFFFFF', fontSize: 34 / 2, fontWeight: '700', letterSpacing: -0.2 },
  secondaryCta: {
    minHeight: 62,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#D7D1C8',
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: '#5E5750', fontSize: 34 / 2, fontWeight: '600' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  signInRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signInMuted: { fontSize: 32 / 2, color: '#4B4743' },
  signInLink: { fontSize: 32 / 2, color: '#141414', fontWeight: '800' },
  legalRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  legalLink: { color: '#7C756C', fontSize: 14, textDecorationLine: 'underline' },
  legalDot: { color: '#9D978D', fontSize: 14 },
});
