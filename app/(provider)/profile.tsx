import { StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useAuth, signOut } from '@/hooks/useAuth';

export default function ProviderProfileScreen() {
  const { profile } = useAuth();

  return (
    <SafeView>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Avatar name={profile?.full_name ?? '?'} uri={profile?.avatar_url} size={72} />
        <Text style={styles.name}>{profile?.full_name}</Text>
        <Text style={styles.meta}>{profile?.email}</Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Button title="Sign out" variant="outline" onPress={() => void signOut()} />
      </View>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.charcoal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  card: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 16,
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.charcoal },
  meta: { color: colors.stone },
});
