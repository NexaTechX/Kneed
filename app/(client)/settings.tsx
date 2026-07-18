import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppHeader } from '@/components/layout/AppHeader';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { spacing } from '@/constants/spacing';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { signOut, useAuth } from '@/hooks/useAuth';

export default function SettingsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(), []);
  const { user, profile } = useAuth();
  // Auth session email is only available to the signed-in user — never shown on public profiles.
  const email = user?.email ?? profile?.email ?? '';

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <AppHeader title="Settings" subtitle="Account" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Email</Text>
          <Text style={[styles.helper, { color: t.textSecondary }]}>
            Only you can see this. It is not shown on your public profile.
          </Text>
          <View style={[styles.emailRow, { backgroundColor: t.surfaceMuted, borderColor: t.border }]}>
            <Ionicons name="mail-outline" size={18} color={t.textSecondary} />
            <Text style={[styles.emailText, { color: t.text }]} selectable>
              {email || 'No email on file'}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Legal</Text>
          <LinkRow
            label="Privacy policy"
            onPress={() => router.push('/(auth)/privacy')}
            t={t}
          />
          <LinkRow
            label="Terms of service"
            onPress={() => router.push('/(auth)/terms')}
            t={t}
          />
        </Card>

        <Button title="Sign out" variant="outline" onPress={() => void signOut()} />
      </ScrollView>
    </SafeView>
  );
}

function LinkRow({
  label,
  onPress,
  t,
}: {
  label: string;
  onPress: () => void;
  t: AppTheme;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={stylesLink.row}>
      {({ pressed }) => (
        <View style={[stylesLink.inner, pressed && { opacity: 0.85 }]}>
          <Text style={[stylesLink.label, { color: t.text }]}>{label}</Text>
          <Ionicons name="chevron-forward" size={18} color={t.textTertiary} />
        </View>
      )}
    </Pressable>
  );
}

const stylesLink = StyleSheet.create({
  row: { marginTop: spacing.xs },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: { fontSize: 15, fontWeight: '500' },
});

function createStyles() {
  return StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl + 24 },
    card: { gap: spacing.xs },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    helper: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
    emailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    emailText: { flex: 1, fontSize: 15 },
  });
}
