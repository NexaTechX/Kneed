import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { config } from '@/constants/config';

type Variant = 'coral' | 'dustyrose' | 'outline';

export function Button({
  title,
  loading,
  variant = 'coral',
  style,
  textStyle,
  disabled,
  ...rest
}: PressableProps & {
  title: string;
  loading?: boolean;
  variant?: Variant;
  textStyle?: TextStyle;
  style?: ViewStyle;
}) {
  const bg =
    variant === 'coral'
      ? colors.coral
      : variant === 'dustyrose'
        ? colors.dustyrose
        : 'transparent';
  const border = variant === 'outline' ? colors.coral : 'transparent';
  const color = variant === 'outline' ? colors.coral : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'outline' ? 2 : 0 },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.text, { color }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: config.minTouchSize,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
