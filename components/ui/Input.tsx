import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts } from '@/constants/typography';

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.stone}
      style={[styles.input, props.style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.brown,
    backgroundColor: colors.backgroundAlt,
  },
});
