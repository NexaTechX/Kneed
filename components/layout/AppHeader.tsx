import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

type Props = {
  title: string;
  subtitle?: string;
  /** Right-side actions (icons, chips) */
  right?: ReactNode;
} & Pick<ViewProps, 'style'>;

export function AppHeader({ title, subtitle, right, style }: Props) {
  const t = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.border }, style]} accessibilityRole="header">
      <View style={styles.left}>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.textTertiary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  left: { flex: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
});
