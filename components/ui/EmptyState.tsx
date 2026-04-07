import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts } from '@/constants/typography';

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  illustration,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      {illustration ? <View style={styles.illu}>{illustration}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  illu: { marginBottom: spacing.lg },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.brown,
    textAlign: 'center',
  },
  sub: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.stone,
    textAlign: 'center',
    lineHeight: 22,
  },
});
