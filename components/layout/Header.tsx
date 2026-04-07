import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

export function Header({ title, showBack }: { title: string; showBack?: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <FontAwesome name="chevron-left" size={20} color={colors.charcoal} />
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.charcoal },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
