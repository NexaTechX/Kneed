import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SearchProviderRow } from '@/hooks/useProviders';
import { formatCents } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { RatingStarsDisplay } from '@/components/provider/RatingStars';
import type { AppTheme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { spacing } from '@/constants/spacing';

export function ProviderCard({
  row,
  nextSlotLabel,
}: {
  row: SearchProviderRow;
  nextSlotLabel?: string;
}) {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const a11yLabel = `${row.full_name}, ${row.distance_miles.toFixed(1)} miles away, from ${formatCents(row.min_price_cents)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Opens provider profile and booking"
      onPress={() => router.push(`/(client)/provider/${row.provider_id}` as never)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Avatar name={row.full_name} size={100} />
      <View style={styles.content}>
        <Text style={styles.name}>{row.full_name}</Text>
        <RatingStarsDisplay value={row.average_rating} />
        <Text style={styles.price}>From {formatCents(row.min_price_cents)}</Text>
        {nextSlotLabel ? <Text style={styles.next}>{nextSlotLabel}</Text> : null}
        {!nextSlotLabel ? <Text style={styles.next}>Tap to view availability and book</Text> : null}
        <Text style={styles.dist}>{row.distance_miles.toFixed(1)} mi away</Text>
      </View>
    </Pressable>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: t.surfaceElevated,
      borderRadius: 18,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
      marginBottom: spacing.md,
      shadowColor: t.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 3,
    },
    pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
    content: { flex: 1, marginLeft: spacing.md },
    name: { fontSize: 18, fontWeight: '800', color: t.text, letterSpacing: -0.3 },
    price: { marginTop: 6, fontSize: 15, fontWeight: '700', color: t.primary },
    next: { marginTop: 4, fontSize: 13, color: t.textSecondary, lineHeight: 18 },
    dist: { marginTop: 4, fontSize: 12, fontWeight: '600', color: t.textTertiary },
  });
}
