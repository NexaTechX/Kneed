import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SearchProviderRow } from '@/hooks/useProviders';
import { formatCents } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { RatingStarsDisplay } from '@/components/provider/RatingStars';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

export function ProviderCard({
  row,
  nextSlotLabel,
}: {
  row: SearchProviderRow;
  nextSlotLabel?: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/(client)/provider/${row.provider_id}` as never)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <Avatar name={row.full_name} size={100} />
      <View style={styles.content}>
        <Text style={styles.name}>{row.full_name}</Text>
        <RatingStarsDisplay value={row.average_rating} />
        <Text style={styles.price}>From {formatCents(row.min_price_cents)}</Text>
        {nextSlotLabel ? <Text style={styles.next}>{nextSlotLabel}</Text> : null}
        <Text style={styles.dist}>{row.distance_miles.toFixed(1)} mi away</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.md,
  },
  content: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: 18, fontWeight: '700', color: colors.charcoal },
  price: { marginTop: 6, fontSize: 15, fontWeight: '600', color: colors.coral },
  next: { marginTop: 4, fontSize: 13, color: colors.stone },
  dist: { marginTop: 4, fontSize: 12, color: colors.stone },
});
