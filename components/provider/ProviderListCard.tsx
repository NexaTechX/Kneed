import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { SearchProviderRow } from '@/hooks/useProviders';
import { formatCents } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { RatingStarsDisplay } from '@/components/provider/RatingStars';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts } from '@/constants/typography';

export function ProviderListCard({
  row,
  nextAvailableLabel,
}: {
  row: SearchProviderRow;
  nextAvailableLabel?: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/(client)/provider/${row.provider_id}` as never)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}>
      <View style={styles.avatarWrap}>
        <Avatar name={row.full_name} size={72} />
        {row.is_verified ? (
          <View style={styles.verifiedDot}>
            <FontAwesome name="check" size={10} color={colors.white} />
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {row.full_name}
          </Text>
          <Text style={styles.price}>{formatCents(row.min_price_cents)}/hr</Text>
        </View>
        {row.is_verified ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LICENSED & VERIFIED</Text>
          </View>
        ) : null}
        <Text style={styles.dist}>{row.distance_miles.toFixed(1)} mi away</Text>
        <View style={styles.ratingRow}>
          <RatingStarsDisplay value={row.average_rating} size={14} />
          <Text style={styles.reviews}>
            {row.average_rating.toFixed(1)} ({row.total_reviews} reviews)
          </Text>
        </View>
        {nextAvailableLabel ? (
          <Text style={styles.next}>Next available: {nextAvailableLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrap: { position: 'relative' },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.verifiedGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  body: { flex: 1, marginLeft: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.brown,
    flex: 1,
    marginRight: spacing.sm,
  },
  price: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.coralBright,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.badgePink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  badgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.error,
    letterSpacing: 0.5,
  },
  dist: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  reviews: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.stone,
  },
  next: {
    marginTop: 8,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.brown,
  },
});
