import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

export function Input(props: TextInputProps) {
  const t = useAppTheme();
  return (
    <TextInput
      placeholderTextColor={t.textTertiary}
      style={[
        styles.input,
        {
          borderColor: t.borderStrong,
          color: t.text,
          backgroundColor: t.inputBackground,
        },
        props.style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontWeight: '400',
  },
});
