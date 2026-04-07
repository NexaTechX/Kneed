import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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

export default function ClientProfileScreen() {
  const { profile, user } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [emailReminders, setEmailReminders] = useState(true);
  const [pushTips, setPushTips] = useState(true);
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

  const onSignOut = async () => {
    await signOut();
  };

  return (
    <SafeView>
      <ScreenHeader title="Your profile" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[textStyles.bodyMuted, styles.lead]}>Manage your account and preferences.</Text>

        <View style={styles.avatarBlock}>
          <View style={styles.avatarWrap}>
            <Avatar name={profile?.full_name ?? '?'} uri={profile?.avatar_url} size={96} />
            <Pressable
              style={styles.camBadge}
              onPress={() => Alert.alert('Photo', 'Profile photo upload coming soon.')}
              accessibilityRole="button">
              <FontAwesome name="camera" size={16} color={colors.white} />
            </Pressable>
          </View>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Full name</Text>
          <Input value={name} onChangeText={setName} placeholder="Your name" />
          <Text style={styles.fieldLabel}>Phone</Text>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="555-0100" />
        </Card>

        <Text style={styles.section}>Notifications</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Booking reminders</Text>
            <Switch value={emailReminders} onValueChange={setEmailReminders} trackColor={{ true: colors.coralBright }} />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Tips & wellness</Text>
            <Switch value={pushTips} onValueChange={setPushTips} trackColor={{ true: colors.coralBright }} />
          </View>
        </Card>

        <Text style={styles.section}>Payment</Text>
        <Card style={styles.card}>
          <Pressable
            style={styles.payRow}
            onPress={() => Alert.alert('Payment methods', 'Card management is not connected yet.')}
            accessibilityRole="button">
            <FontAwesome name="credit-card" size={24} color={colors.mauve} />
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>Visa ·•••· 4242</Text>
              <Text style={styles.paySub}>Demo — not charged</Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color={colors.stone} />
          </Pressable>
        </Card>

        <Button title="Save changes" loading={saving} onPress={() => void onSave()} style={{ marginTop: spacing.md }} />
        <Button title="Sign out" variant="outline" onPress={() => void onSignOut()} style={{ marginTop: spacing.sm }} />
        <Link href="/(onboarding)/role-select" asChild>
          <Button title="Switch role" variant="dustyrose" style={{ marginTop: spacing.sm }} />
        </Link>
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  lead: { marginBottom: spacing.lg },
  avatarBlock: { alignItems: 'center', marginBottom: spacing.lg },
  avatarWrap: { position: 'relative' },
  camBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  email: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
  },
  card: { gap: spacing.sm },
  fieldLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.brown,
    marginTop: spacing.xs,
  },
  section: {
    fontFamily: fonts.serifSemi,
    fontSize: 18,
    color: colors.brownDark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  rowLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.brown, flex: 1, marginRight: spacing.md },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  payTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.brown },
  paySub: { fontSize: 13, color: colors.stone, marginTop: 2, fontFamily: fonts.body },
});
