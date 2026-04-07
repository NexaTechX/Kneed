import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

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
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.dustyrose,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
});
