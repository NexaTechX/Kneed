import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { config } from '@/constants/config';

type Variant = 'coral' | 'dustyrose' | 'outline' | 'ghost';

export function Button({
  title,
  loading,
  variant = 'coral',
  style,
  textStyle,
  disabled,
  accessibilityLabel,
  ...rest
}: PressableProps & {
  title: string;
  loading?: boolean;
  variant?: Variant;
  textStyle?: TextStyle;
  style?: ViewStyle;
}) {
  const t = useAppTheme();
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'dustyrose';
  const isGhost = variant === 'ghost';

  const bg = isGhost ? 'transparent' : isOutline ? 'transparent' : isSecondary ? t.secondary : t.primary;
  const borderColor = isGhost ? 'transparent' : isOutline ? t.borderStrong : 'transparent';
  const color = isGhost ? t.textSecondary : isOutline ? t.primary : isSecondary ? t.onSecondary : t.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: isOutline ? 1.5 : 0,
          shadowColor: !isOutline && !isGhost && !disabled && !loading ? t.shadow : 'transparent',
        },
        !isOutline && !isGhost && !disabled && !loading && styles.shadow,
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
});
