import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { fetchProfile, updateProfile } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileSetupScreen() {
  const router = useRouter();
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
      if (profile?.role === 'provider') {
        router.replace('/(onboarding)/provider-verify');
      } else {
        router.replace('/(client)/(tabs)/discover');
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView>
      <ScreenHeader title="Your profile" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[textStyles.bodyMuted, styles.lead]}>A few details so providers know who you are.</Text>
        <Card style={styles.card}>
          <Text style={styles.label}>Full name</Text>
          <Input value={name} onChangeText={setName} placeholder="Alex Rivera" />
          <Text style={styles.label}>Phone (optional)</Text>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="555-0100" />
          <Button title="Continue" loading={loading} onPress={onContinue} style={{ marginTop: spacing.lg }} />
        </Card>
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  lead: { marginBottom: spacing.md },
  card: { gap: spacing.sm },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.brown, marginTop: spacing.xs },
});
