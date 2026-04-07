import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function WelcomeScreen() {
  return (
    <SafeView style={styles.center}>
      <Text style={styles.logo}>Knead</Text>
      <Text style={styles.tagline}>Massage, matched to you.</Text>
      {!isSupabaseConfigured ? (
        <Text style={styles.warn}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env</Text>
      ) : null}
      <View style={styles.actions}>
        <Link href="/(auth)/register?role=client" asChild>
          <Button title="Continue as client" />
        </Link>
        <Link href="/(auth)/register?role=provider" asChild>
          <Button title="Continue as provider" variant="dustyrose" />
        </Link>
        <Link href="/(auth)/login" asChild>
          <Button title="Log in" variant="outline" />
        </Link>
      </View>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  logo: { fontSize: 36, fontWeight: '800', color: colors.coral, textAlign: 'center' },
  tagline: { marginTop: spacing.sm, fontSize: 16, color: colors.stone, textAlign: 'center' },
  warn: { marginTop: spacing.md, color: colors.error, textAlign: 'center' },
  actions: { marginTop: spacing.xl, gap: spacing.md },
});
