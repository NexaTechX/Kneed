import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { spacing } from '@/constants/spacing';

const BRAND = {
  page: '#FAF9F6',
  card: '#FFFFFF',
  accent: '#A74D33',
  accentSoft: '#F3E8E1',
  text: '#141414',
  muted: '#5A554F',
  border: '#E8E1D8',
} as const;

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeView style={styles.root}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
            <FontAwesome name="chevron-left" size={18} color={BRAND.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Terms of Use</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>KNEAD LEGAL</Text>
          <Text style={styles.title}>Terms, made clear.</Text>
          <Text style={styles.subtitle}>
            These terms explain how bookings, payments, cancellations, and provider-client interactions work in Knead.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Booking & Services</Text>
          <Text style={styles.p}>
            Knead connects clients with independent massage and wellness providers. Providers are responsible for service
            quality, credentials, punctuality, and local compliance.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Payments & Refunds</Text>
          <Text style={styles.p}>
            Payments are processed through secure third-party providers such as Paystack. Cancellation windows,
            rescheduling rules, and refund eligibility depend on your policy and provider terms.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Safety & Conduct</Text>
          <Text style={styles.p}>
            Users must follow community standards and local regulations. Harassment, fraudulent activity, or abuse of the
            platform may result in account suspension.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Liability</Text>
          <Text style={styles.p}>
            Knead is a booking platform and does not replace professional legal or medical advice. Final production terms
            should be reviewed by legal counsel before launch.
          </Text>
        </View>

        <View style={styles.ctaRow}>
          <Link href="/(auth)/privacy" asChild>
            <Pressable style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Read Privacy</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)/welcome" asChild>
            <Pressable style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Back to Welcome</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.page },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.card,
  },
  backBtnPlaceholder: { width: 42, height: 42 },
  headerTitle: { color: BRAND.text, fontSize: 18, fontWeight: '700' },
  hero: {
    backgroundColor: BRAND.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  kicker: {
    color: BRAND.accent,
    fontSize: 11,
    letterSpacing: 1.3,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  title: { color: BRAND.text, fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { marginTop: spacing.md, color: BRAND.muted, fontSize: 16, lineHeight: 24 },
  sectionCard: {
    backgroundColor: BRAND.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: BRAND.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  p: { color: BRAND.muted, fontSize: 15, lineHeight: 23 },
  ctaRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.accentSoft,
    borderWidth: 1,
    borderColor: '#E8D6CA',
  },
  secondaryBtnText: { color: BRAND.accent, fontSize: 15, fontWeight: '700' },
  primaryBtn: {
    flex: 1.2,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.accent,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
