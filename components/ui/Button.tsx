import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';
import { config } from '@/constants/config';
import { fonts } from '@/constants/typography';

type Variant = 'coral' | 'dustyrose' | 'outline' | 'secondary';

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
      ? colors.coralBright
      : variant === 'dustyrose'
        ? colors.dustyRoseCard
        : variant === 'secondary'
          ? colors.white
          : 'transparent';
  const border =
    variant === 'outline'
      ? colors.outline
      : variant === 'secondary'
        ? colors.outline
        : 'transparent';
  const color =
    variant === 'outline' || variant === 'secondary' ? colors.brown : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1.5 : 0,
        },
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
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
