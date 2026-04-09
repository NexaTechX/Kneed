import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { geocodeAddress } from '@/lib/geocode';
import { supabase } from '@/lib/supabase';
import type { Provider } from '@/types/database';

export default function ProviderProfileScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [studioAddress, setStudioAddress] = useState('');
  const [bio, setBio] = useState('');
  const [travelRadius, setTravelRadius] = useState('10');
  const [saving, setSaving] = useState(false);

  const { data: provider } = useQuery({
    queryKey: ['provider-me', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('providers').select('*').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data as Provider | null;
    },
  });

  useEffect(() => {
    if (!provider) return;
    setStudioAddress(provider.studio_address ?? '');
    setBio(provider.bio ?? '');
    setTravelRadius(String(provider.travel_radius_miles ?? 10));
  }, [provider]);

  const onSave = async () => {
    if (!user) return;
    const miles = parseFloat(travelRadius);
    if (Number.isNaN(miles) || miles < 0) {
      Alert.alert('Invalid radius', 'Enter travel radius in miles (0 or more).');
      return;
    }
    setSaving(true);
    try {
      let lat: number | null = provider?.lat ?? null;
      let lng: number | null = provider?.lng ?? null;
      const addr = studioAddress.trim();
      if (addr) {
        const coords = await geocodeAddress(addr);
        if (!coords) {
          Alert.alert(
            'Address not found',
            'Could not place that address on the map. Check spelling or add city and region.',
          );
          setSaving(false);
          return;
        }
        lat = coords.lat;
        lng = coords.lng;
      }

      const { error } = await supabase
        .from('providers')
        .update({
          studio_address: addr || null,
          bio: bio.trim() || null,
          travel_radius_miles: miles,
          lat,
          lng,
        })
        .eq('id', user.id);
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: ['provider-me', user.id] });
      Alert.alert('Saved', addr ? 'Your listing location was updated for search.' : 'Profile updated.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeView>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <ScreenTitle kicker="Listing" title="Profile" />
        <Card style={styles.hero}>
          <Avatar name={profile?.full_name ?? '?'} uri={profile?.avatar_url} size={80} />
          <Text style={styles.name}>{profile?.full_name}</Text>
          <Text style={styles.meta}>{profile?.email}</Text>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery & studio</Text>
          <Text style={styles.hint}>
            Add an address so clients can find you nearby. Mobile providers can use a home or service-area address.
          </Text>
          <Text style={styles.label}>Studio or base address</Text>
          <Input
            value={studioAddress}
            onChangeText={setStudioAddress}
            placeholder="123 Main St, City"
          />
          <Text style={styles.label}>Bio (optional)</Text>
          <Input
            value={bio}
            onChangeText={setBio}
            placeholder="Tell clients about your practice"
            multiline
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />
          <Text style={styles.label}>Travel radius (miles)</Text>
          <Input value={travelRadius} onChangeText={setTravelRadius} keyboardType="decimal-pad" />
          {provider?.lat != null && provider?.lng != null ? (
            <Text style={styles.coords}>
              Map pin: {provider.lat.toFixed(4)}, {provider.lng.toFixed(4)}
            </Text>
          ) : (
            <Text style={[styles.warn, { color: t.error }]}>Save an address to appear in Discover search.</Text>
          )}
          <Button title="Save listing details" loading={saving} onPress={() => void onSave()} style={{ marginTop: spacing.md }} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <Button
            title="Switch role"
            variant="dustyrose"
            onPress={() => router.push('/(onboarding)/role-select')}
          />
          <Button title="Sign out" variant="outline" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    hero: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      alignItems: 'center',
      gap: spacing.sm,
    },
    name: { fontSize: 22, fontWeight: '800', color: t.text, letterSpacing: -0.3 },
    meta: { color: t.textSecondary },
    section: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.lg },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: t.text, marginBottom: spacing.xs, letterSpacing: -0.3 },
    hint: { fontSize: 14, color: t.textSecondary, marginBottom: spacing.sm, lineHeight: 20 },
    label: { fontSize: 12, fontWeight: '700', color: t.textTertiary, marginTop: spacing.sm, letterSpacing: 0.5, textTransform: 'uppercase' },
    coords: { fontSize: 12, color: t.textTertiary, marginTop: spacing.xs },
    warn: { fontSize: 14, marginTop: spacing.sm, lineHeight: 20 },
  });
}
