import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
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
      <Header title="Provider verification" showBack />
      <View style={styles.form}>
        <Text style={styles.text}>Upload your license image for review. You can still use the app while pending.</Text>
        <Text style={styles.label}>License number</Text>
        <Input value={license} onChangeText={setLicense} placeholder="State license #" />
        <Text style={styles.label}>Years of experience</Text>
        <Input value={years} onChangeText={setYears} keyboardType="number-pad" />
        <Button title="Choose license image" loading={loading} onPress={pickImage} style={{ marginTop: spacing.md }} />
      </View>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg, gap: spacing.sm },
  text: { fontSize: 14, color: colors.stone, marginBottom: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.charcoal },
});
