import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { GradientButton } from '@/components/ui/GradientButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/database';

export default function RoleSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<UserRole | null>(null);

  const continueRole = async () => {
    if (!user || !selected) {
      Alert.alert('Choose a path', 'Select I need relief or I\'m a therapist.');
      return;
    }
    try {
      const { error } = await supabase.from('profiles').update({ role: selected }).eq('id', user.id);
      if (error) throw error;
      if (selected === 'provider') {
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
      <ScreenHeader title="Welcome" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[textStyles.bodyMuted, styles.intro]}>Tell us how you&apos;ll use Knead.</Text>

        <Pressable
          onPress={() => setSelected('client')}
          style={[styles.card, selected === 'client' && styles.cardOn]}>
          <View style={styles.cardImg}>
            <Image source={require('@/assets/images/icon.png')} style={styles.thumb} resizeMode="contain" />
          </View>
          <Text style={styles.cardTitle}>I need relief</Text>
        </Pressable>

        <Pressable
          onPress={() => setSelected('provider')}
          style={[styles.card, selected === 'provider' && styles.cardOn]}>
          <View style={[styles.cardImg, { backgroundColor: colors.teal }]}>
            <Text style={styles.emoji}>👨‍⚕️</Text>
          </View>
          <Text style={styles.cardTitle}>I&apos;m a therapist</Text>
          <Text style={styles.cardSub}>Grow your practice and manage your sanctuary.</Text>
        </Pressable>

        <GradientButton title="Continue" onPress={continueRole} icon="arrow-right" style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: { textAlign: 'center', marginBottom: spacing.lg },
  card: {
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardOn: {
    borderColor: colors.coralBright,
  },
  cardImg: {
    height: 140,
    borderRadius: 16,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  thumb: { width: 100, height: 100, opacity: 0.4 },
  emoji: { fontSize: 64 },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.brown,
  },
  cardSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.stone,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
