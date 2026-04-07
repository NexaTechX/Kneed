import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/database';

export default function RoleSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const choose = async (role: UserRole) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id);
      if (error) throw error;
      if (role === 'provider') {
        const { error: ie } = await supabase.from('providers').upsert({ id: user.id, license_number: '', years_exp: 0 });
        if (ie) throw ie;
      }
      router.replace('/(onboarding)/profile-setup');
    } catch (e: unknown) {
      Alert.alert('Could not update role', e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <SafeView>
      <Header title="Choose role" showBack />
      <View style={styles.body}>
        <Text style={styles.text}>How will you use Knead?</Text>
        <Button title="Client — book sessions" onPress={() => void choose('client')} />
        <Button title="Provider — offer services" variant="dustyrose" onPress={() => void choose('provider')} />
      </View>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  text: { fontSize: 16, color: colors.charcoal, marginBottom: spacing.sm },
});
