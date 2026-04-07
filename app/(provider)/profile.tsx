import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { fetchProfile, updateProfile } from '@/lib/auth';
import { useAuth, signOut } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

export default function ProviderProfileScreen() {
  const { profile, user } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: name.trim(),
        phone: phone.trim() || null,
      });
      const fresh = await fetchProfile(user.id);
      if (fresh) useAuthStore.getState().setProfile(fresh);
      Alert.alert('Saved');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeView>
      <ScreenHeader title="Your profile" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[textStyles.bodyMuted, styles.lead]}>Provider account details.</Text>
        <View style={styles.avatarBlock}>
          <Avatar name={profile?.full_name ?? '?'} uri={profile?.avatar_url} size={88} />
        </View>
        <Text style={styles.email}>{profile?.email}</Text>

        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Full name</Text>
          <Input value={name} onChangeText={setName} placeholder="Your name" />
          <Text style={styles.fieldLabel}>Phone</Text>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="555-0100" />
        </Card>

        <Button title="Save changes" loading={saving} onPress={() => void onSave()} style={{ marginTop: spacing.md }} />
        <Button title="Sign out" variant="outline" onPress={() => void signOut()} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  lead: { marginBottom: spacing.lg },
  avatarBlock: { alignItems: 'center' },
  email: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    marginBottom: spacing.lg,
  },
  card: { gap: spacing.sm },
  fieldLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.brown,
    marginTop: spacing.xs,
  },
});
