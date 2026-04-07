import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' }) {
  const bg =
    tone === 'success' ? colors.success : tone === 'warning' ? colors.coral : colors.dustyrose;
  const fg = colors.white;
  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: { fontSize: 12, fontWeight: '600' },
});
