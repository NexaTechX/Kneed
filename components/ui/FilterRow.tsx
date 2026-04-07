import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { spacing } from '@/constants/spacing';

export type FilterOption = { key: string; label: string };

export function FilterRow({
  options,
  value,
  onChange,
}: {
  options: FilterOption[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}>
      {options.map((opt) => (
        <Chip
          key={opt.key}
          label={opt.label}
          selected={value === opt.key}
          onPress={() => onChange(opt.key)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.lg,
  },
});
