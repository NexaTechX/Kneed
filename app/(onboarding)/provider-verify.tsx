import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function ProviderVerifyScreen() {
  const router = useRouter();
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
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('licenses').upload(path, blob, {
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
      <ScreenHeader title="Verification" showBack />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[textStyles.bodyMuted, styles.lead]}>
          Upload your license for review. You can use the app while we verify your credentials.
        </Text>
        <Card style={styles.card}>
          <Text style={styles.label}>License number</Text>
          <Input value={license} onChangeText={setLicense} placeholder="State license #" />
          <Text style={styles.label}>Years of experience</Text>
          <Input value={years} onChangeText={setYears} keyboardType="number-pad" />
          <Button title="Upload license image" loading={loading} onPress={pickImage} style={{ marginTop: spacing.md }} />
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
