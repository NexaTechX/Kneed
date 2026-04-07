import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts } from '@/constants/typography';

export function ScreenHeader({
  title,
  showBack,
  right,
  titleSerif = true,
}: {
  title: string;
  showBack?: boolean;
  right?: ReactNode;
  titleSerif?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable onPress={() => router.back()} style={styles.side} accessibilityRole="button">
          <FontAwesome name="chevron-left" size={22} color={colors.brown} />
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}
      <Text
        style={[styles.title, titleSerif && { fontFamily: fonts.serifBold }]}
        numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side}>{right}</View>
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
    minHeight: 52,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.brownDark,
  },
  side: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
