import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

type Props = {
  title: string;
  /** Small uppercase label above the title */
  kicker?: string;
};

export function ScreenTitle({ title, kicker }: Props) {
  const t = useAppTheme();
  return (
    <View style={styles.wrap} accessibilityRole="header">
      {kicker ? (
        <Text style={[styles.kicker, { color: t.textTertiary }]} numberOfLines={1}>
          {kicker}
        </Text>
      ) : null}
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 34,
  },
});
