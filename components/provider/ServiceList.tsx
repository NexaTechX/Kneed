import { StyleSheet, Text, View } from 'react-native';
import type { Service } from '@/types/database';
import { formatCents } from '@/lib/utils';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

export function ServiceList({ services }: { services: Service[] }) {
  return (
    <View style={styles.wrap}>
      {services.map((s) => (
        <View key={s.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{s.type.replace('_', ' ')}</Text>
            <Text style={styles.meta}>
              {s.duration_min} min · {s.location_type}
            </Text>
          </View>
          <Text style={styles.price}>{formatCents(s.price_cents)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dustyrose,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.charcoal, textTransform: 'capitalize' },
  meta: { fontSize: 13, color: colors.stone, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '700', color: colors.coral },
});
