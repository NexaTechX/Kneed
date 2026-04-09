import { StyleSheet, View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

export function Card({ style, ...rest }: ViewProps) {
  const t = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.surfaceElevated,
          borderColor: t.border,
          shadowColor: t.shadow,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
});
