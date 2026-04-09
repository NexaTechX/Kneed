import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' }) {
  const t = useAppTheme();
  const bg =
    tone === 'success' ? t.success : tone === 'warning' ? t.primaryMuted : t.surfaceElevated;
  const fg =
    tone === 'success'
      ? '#FFFFFF'
      : tone === 'warning'
        ? t.warning
        : t.textSecondary;
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: bg },
        tone === 'neutral' && { borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
      ]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2, textTransform: 'capitalize' },
});
