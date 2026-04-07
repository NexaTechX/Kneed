import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
      accessibilityRole="button">
      <Text style={[styles.text, selected && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
  },
  chipOn: {
    backgroundColor: colors.coralBright,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.brown,
  },
  textOn: {
    color: colors.white,
    fontFamily: fonts.bodySemi,
  },
});
