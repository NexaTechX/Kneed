import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export function Avatar({ uri, name, size = 56 }: { uri?: string | null; name: string; size?: number }) {
  const t = useAppTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.primaryMuted,
          borderColor: t.borderStrong,
        },
      ]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initial, { color: t.text }, { fontSize: Math.round(size * 0.36) }]}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  initial: { fontWeight: '800' },
});
