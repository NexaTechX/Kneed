import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function ProviderVerifyScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { user } = useAuth();
  const [license, setLicense] = useState('');
  const [years, setYears] = useState('3');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload your license.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (res.canceled || !user) return;
    setLoading(true);
    try {
      const asset = res.assets[0];
      const picked = new File(asset.uri);
      const buffer = await picked.arrayBuffer();
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('licenses').upload(path, buffer, {
        contentType: asset.mimeType ?? 'image/jpeg',
        upsert: true,
      });
      if (upErr) throw upErr;

      const { error: pErr } = await supabase
        .from('providers')
        .update({
          license_image: path,
          license_number: license.trim() || 'pending',
          years_exp: parseInt(years, 10) || 0,
        })
        .eq('id', user.id);
      if (pErr) throw pErr;

      router.replace('/(provider)/dashboard');
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeView>
      <Header title="Provider verification" showBack />
      <View style={styles.wrap}>
        <Text style={[styles.text, { color: t.textSecondary }]}>
          Upload your license image for review. You can still use the app while pending.
        </Text>
        <Card style={styles.callout}>
          <Text style={[styles.calloutTitle, { color: t.text }]}>Visibility</Text>
          <Text style={[styles.calloutBody, { color: t.textSecondary }]}>
            Until an admin approves your license, you will not appear in client search results. We will review as soon as
            possible.
          </Text>
        </Card>
        <Card style={styles.form}>
          <Text style={styles.label}>License number</Text>
          <Input value={license} onChangeText={setLicense} placeholder="State license #" />
          <Text style={styles.label}>Years of experience</Text>
          <Input value={years} onChangeText={setYears} keyboardType="number-pad" />
          <Button title="Choose license image" loading={loading} onPress={pickImage} style={{ marginTop: spacing.md }} />
        </Card>
      </View>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    wrap: { padding: spacing.lg, gap: spacing.md },
    text: { fontSize: 15, lineHeight: 22 },
    callout: { gap: spacing.xs },
    calloutTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
    calloutBody: { fontSize: 14, lineHeight: 20 },
    form: { gap: spacing.sm },
    label: { fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
  });
}
