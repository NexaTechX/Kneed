import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { fetchProfile, updateProfile } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [loading, setLoading] = useState(false);

  const onContinue = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    setLoading(true);
    try {
      await updateProfile(user.id, {
        full_name: name.trim(),
        phone: phone.trim() || null,
      });
      const fresh = await fetchProfile(user.id);
      if (fresh) useAuthStore.getState().setProfile(fresh);
      router.replace('/(client)/(tabs)/feed');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView>
      <Header title="Your profile" showBack />
      <View style={styles.wrap}>
        <Text style={[styles.intro, { color: t.textSecondary }]}>
          Add your name so people recognize you on the feed.
        </Text>
        <Card style={styles.form}>
          <Text style={styles.label}>Full name</Text>
          <Input value={name} onChangeText={setName} placeholder="Alex Rivera" />
          <Text style={styles.label}>Phone (optional)</Text>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="555-0100" />
          <Button title="Continue" loading={loading} onPress={onContinue} style={{ marginTop: spacing.lg }} />
        </Card>
      </View>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    wrap: { padding: spacing.lg, gap: spacing.md },
    intro: { fontSize: 15, lineHeight: 22 },
    form: { gap: spacing.sm },
    label: { fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
  });
}
