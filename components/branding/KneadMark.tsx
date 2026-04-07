import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

type Size = 'sm' | 'md' | 'lg';

const sizes = {
  sm: { icon: 18, text: 18 },
  md: { icon: 22, text: 22 },
  lg: { icon: 28, text: 28 },
};

export function KneadMark({ size = 'md' }: { size?: Size }) {
  const s = sizes[size];
  return (
    <View style={styles.row}>
      <FontAwesome name="leaf" size={s.icon} color={colors.mauve} />
      <Text style={[styles.wordmark, { fontSize: s.text }]}>Knead</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: {
    fontFamily: fonts.serifBold,
    color: colors.mauve,
  },
});
