import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenTitle } from '@/components/layout/ScreenTitle';
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
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [1, 1] });
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

  return (
    <SafeView>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenTitle kicker="Account" title="Profile" />
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <Avatar name={profile?.full_name ?? '?'} uri={avatarUrl} size={80} />
          </View>
          <Button title="Change photo" variant="outline" loading={uploading} onPress={() => void pickAvatar()} />
          <Text style={styles.label}>Name</Text>
          <Input value={fullName} onChangeText={setFullName} placeholder="Your name" />
          <Text style={styles.label}>Phone</Text>
          <Input value={phone} onChangeText={setPhone} placeholder="Optional" keyboardType="phone-pad" />
          <Text style={styles.meta}>{profile?.email}</Text>
          <Text style={styles.meta}>Role: {profile?.role}</Text>
          <Button title="Save changes" loading={saving} onPress={() => void onSave()} style={{ marginTop: spacing.md }} />
        </Card>
        <View style={styles.actions}>
          <Button title="Sign out" variant="outline" onPress={() => void onSignOut()} />
          <Button
            title="Switch role"
            variant="dustyrose"
            onPress={() => router.push('/(onboarding)/role-select')}
          />
        </View>
      </ScrollView>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    scroll: { paddingBottom: spacing.xxl },
    card: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    avatarRow: { alignItems: 'center', marginBottom: spacing.xs },
    label: { fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.6, textTransform: 'uppercase' },
    meta: { color: t.textSecondary, fontSize: 14 },
    actions: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.lg },
  });
}
