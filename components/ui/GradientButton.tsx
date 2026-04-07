import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: 'arrow-right' | 'lock' | 'none';
  style?: ViewStyle;
};

export function GradientButton({ title, onPress, loading, disabled, icon = 'arrow-right', style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [pressed && styles.pressed, style]}>
      <LinearGradient
        colors={[colors.terracotta, colors.dustyRoseCard]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.grad, (disabled || loading) && styles.disabled]}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Text style={styles.text}>{title}</Text>
            {icon === 'arrow-right' ? (
              <FontAwesome name="arrow-right" size={18} color={colors.white} style={styles.icon} />
            ) : icon === 'lock' ? (
              <FontAwesome name="lock" size={16} color={colors.white} style={styles.icon} />
            ) : null}
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grad: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.white,
  },
  icon: { marginLeft: 10 },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.55 },
});
