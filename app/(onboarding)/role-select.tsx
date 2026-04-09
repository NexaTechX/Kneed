import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { fetchProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';

export default function RoleSelectScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  const navigateAfterRoleChange = async (role: UserRole) => {
    if (!user) return;
    const fresh = await fetchProfile(user.id);
    if (fresh) useAuthStore.getState().setProfile(fresh);

    void qc.invalidateQueries({ queryKey: ['provider-row'] });
    void qc.invalidateQueries({ queryKey: ['provider-me'] });

    if (!fresh?.full_name?.trim()) {
      router.replace('/(onboarding)/profile-setup');
      return;
    }

    if (role === 'provider') {
      const { data: prov } = await supabase.from('providers').select('license_image').eq('id', user.id).maybeSingle();
      if (!prov?.license_image) {
        router.replace('/(onboarding)/provider-verify');
      } else {
        router.replace('/(provider)/dashboard');
      }
      return;
    }

    router.replace('/(client)/(tabs)/discover');
  };

  const choose = async (role: UserRole) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id);
      if (error) throw error;
      if (role === 'provider') {
        const { error: ie } = await supabase.from('providers').upsert({ id: user.id, license_number: '', years_exp: 0 });
        if (ie) throw ie;
      }
      await navigateAfterRoleChange(role);
    } catch (e: unknown) {
      Alert.alert('Could not update role', e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <SafeView>
      <Header title="Choose role" showBack />
      <View style={styles.body}>
        <Text style={[styles.lead, { color: t.text }]}>How will you use Knead?</Text>
        <Text style={[styles.sub, { color: t.textSecondary }]}>
          Pick the experience that matches what you want to do. You can change this later from your profile.
        </Text>
        <Card style={{ gap: spacing.md }}>
          <Button title="Client — book sessions" onPress={() => void choose('client')} />
          <Button title="Provider — offer services" variant="dustyrose" onPress={() => void choose('provider')} />
        </Card>
      </View>
    </SafeView>
  );
}

function createStyles(_t: AppTheme) {
  return StyleSheet.create({
    body: { padding: spacing.lg, gap: spacing.md },
    lead: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
    sub: { fontSize: 15, lineHeight: 22, marginBottom: spacing.sm },
  });
}
