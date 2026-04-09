import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

export function Header({ title, showBack }: { title: string; showBack?: boolean }) {
  const router = useRouter();
  const t = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            style={[styles.back, { backgroundColor: t.surfaceElevated, borderColor: t.border }]}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <FontAwesome name="chevron-left" size={18} color={t.text} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
