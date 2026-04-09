import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Service } from '@/types/database';
import { formatCents } from '@/lib/utils';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

export function ServiceList({ services }: { services: Service[] }) {
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
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

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    title: { fontSize: 16, fontWeight: '700', color: t.text, textTransform: 'capitalize' },
    meta: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
    price: { fontSize: 16, fontWeight: '800', color: t.primary },
  });
}
