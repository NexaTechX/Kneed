import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth, signOut } from '@/hooks/useAuth';
import { fetchProfile, updateProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ClientProfileScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { profile, user } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setAvatarUrl(profile.avatar_url);
  }, [profile]);

  const onSave = async () => {
    if (!user) return;
    const name = fullName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: name,
        phone: phone.trim() || null,
      });
      const fresh = await fetchProfile(user.id);
      if (fresh) setProfile(fresh);
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to change your photo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled) return;
    setUploading(true);
    try {
      const asset = res.assets[0];
      const picked = new File(asset.uri);
      const buffer = await picked.arrayBuffer();
      const path = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, buffer, {
        contentType: asset.mimeType ?? 'image/jpeg',
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      await updateProfile(user.id, { avatar_url: publicUrl });
      setAvatarUrl(publicUrl);
      const fresh = await fetchProfile(user.id);
      if (fresh) setProfile(fresh);
      Alert.alert('Photo updated');
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setUploading(false);
    }
  };

  const onSignOut = async () => {
    await signOut();
  };

  const kycOk = profile?.is_kyc_verified === true;

  return (
    <SafeView style={{ backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[t.primary, '#3F3F46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBg}>
          <Text style={styles.heroLabel}>Profile</Text>
        </LinearGradient>

        <View style={styles.heroCard}>
          <View style={styles.avatarBlock}>
            <Avatar name={profile?.full_name ?? '?'} uri={avatarUrl} size={88} />
            <Button title="Update photo" variant="outline" loading={uploading} onPress={() => void pickAvatar()} />
          </View>
          <Text style={[styles.name, { color: t.text }]}>{profile?.full_name || 'Your profile'}</Text>
          <Text style={[styles.email, { color: t.textSecondary }]}>{profile?.email}</Text>
          <View style={[styles.kycPill, { backgroundColor: kycOk ? `${t.success}18` : t.surfaceMuted, borderColor: t.border }]}>
            <Ionicons name={kycOk ? 'shield-checkmark' : 'shield-outline'} size={14} color={kycOk ? t.success : t.textTertiary} />
            <Text style={[styles.kycText, { color: kycOk ? t.success : t.textSecondary }]}>
              {kycOk ? 'ID verified' : 'ID not verified'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>About you</Text>
          <Card style={styles.formCard}>
            <Text style={[styles.helper, { color: t.textSecondary }]}>
              Verified identity is required for paid posts and Private Room bookings.
            </Text>
            <Text style={[styles.label, { color: t.textTertiary }]}>Name</Text>
            <Input value={fullName} onChangeText={setFullName} placeholder="Your name" />
            <Text style={[styles.label, { color: t.textTertiary }]}>Phone</Text>
            <Input value={phone} onChangeText={setPhone} placeholder="Optional" keyboardType="phone-pad" />
            <Button title="Save changes" loading={saving} onPress={() => void onSave()} style={{ marginTop: spacing.md }} />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Posts & wallet</Text>
          <View style={styles.actionGrid}>
            <PressableCard
              icon="add-circle-outline"
              title="New post"
              subtitle="Optional — publish when you want"
              onPress={() => router.push('/(client)/create-post')}
              t={t}
            />
            <PressableCard
              icon="wallet-outline"
              title="Wallet"
              subtitle="Earnings & payouts"
              onPress={() => router.push('/(client)/wallet')}
              t={t}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button title="Sign out" variant="outline" onPress={() => void onSignOut()} />
        </View>
      </ScrollView>
    </SafeView>
  );
}

function PressableCard({
  icon,
  title,
  subtitle,
  onPress,
  t,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  t: AppTheme;
}) {
  const styles = useMemo(() => pressableStyles(t), [t]);
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <Card style={[styles.card, pressed && { opacity: 0.92 }]}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: t.surfaceMuted }]}>
              <Ionicons name={icon} size={22} color={t.text} />
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.ctaTitle, { color: t.text }]}>{title}</Text>
              <Text style={[styles.ctaSub, { color: t.textTertiary }]}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textTertiary} />
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const pressableStyles = (t: AppTheme) =>
  StyleSheet.create({
    card: { padding: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textCol: { flex: 1, minWidth: 0 },
    ctaTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
    ctaSub: { fontSize: 13, marginTop: 2 },
  });

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    scroll: { paddingBottom: spacing.xxl + 32 },
    heroBg: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl + 20,
    },
    heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' },
    heroCard: {
      marginHorizontal: spacing.lg,
      marginTop: -52,
      backgroundColor: t.surfaceElevated,
      borderRadius: 20,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 6,
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatarBlock: { alignItems: 'center', gap: spacing.sm, marginTop: -56 },
    name: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
    email: { fontSize: 14, textAlign: 'center' },
    kycPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      marginTop: spacing.xs,
    },
    kycText: { fontSize: 12, fontWeight: '600' },
    section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.sm },
    sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
    formCard: {
      gap: spacing.xs,
    },
    helper: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: spacing.xs },
    actionGrid: { gap: spacing.sm },
    footer: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  });
}
