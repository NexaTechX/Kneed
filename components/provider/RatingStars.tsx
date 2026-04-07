import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/constants/colors';

export function RatingStarsDisplay({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <FontAwesome
          key={i}
          name={i < full ? 'star' : 'star-o'}
          size={size}
          color={colors.coral}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

export function RatingStarsInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <View style={styles.row}>
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button" style={styles.hit}>
          <FontAwesome name={n <= value ? 'star' : 'star-o'} size={28} color={colors.coral} />
        </Pressable>
      ))}
      <Text style={styles.caption}>{value}/5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  caption: { marginLeft: 8, color: colors.stone, fontSize: 14 },
});
