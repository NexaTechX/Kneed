import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { SafeView } from '@/components/layout/SafeView';
import type { AppTheme } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { config } from '@/constants/config';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useProviderSearch, type SearchProviderRow } from '@/hooks/useProviders';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import type { ServiceType } from '@/types/database';
import { Avatar } from '@/components/ui/Avatar';
import { formatCents } from '@/lib/utils';

const SERVICE_TYPES: (ServiceType | 'all')[] = ['all', 'swedish', 'deep_tissue', 'sports', 'thai', 'prenatal'];
const NEXT_SLOTS = ['Today 3pm', 'Tomorrow 10am', 'Today 5:30pm', 'Tomorrow 2pm', 'Today 6pm'];

export default function DiscoverScreen() {
  const router = useRouter();
  const t = useAppTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const [lat, setLat] = useState('37.7749');
  const [lng, setLng] = useState('-122.4194');
  const [radius, setRadius] = useState(String(config.defaultSearchRadiusMiles));
  const [serviceType, setServiceType] = useState<ServiceType | 'all' | null>('deep_tissue');
  const { refresh, loading: locLoading, error: locError } = useDeviceLocation();

  useEffect(() => {
    void (async () => {
      const coords = await refresh();
      if (coords) {
        setLat(String(coords.lat));
        setLng(String(coords.lng));
      }
    })();
  }, [refresh]);

  const params = useMemo(
    () => ({
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      radiusMiles: parseFloat(radius) || config.defaultSearchRadiusMiles,
      serviceType: serviceType === 'all' || !serviceType ? null : serviceType,
    }),
    [lat, lng, radius, serviceType],
  );

  const { data, isLoading, isError, error, refetch, isRefetching } = useProviderSearch(params);

  const header = (
    <View>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <FontAwesome name="leaf" size={16} color={t.primary} />
          <Text style={styles.brandText}>The Sanctuary</Text>
        </View>
        <Pressable style={styles.searchBtn}>
          <FontAwesome name="search" size={19} color={t.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.locationRow}>
          <FontAwesome name="map-marker" size={15} color="#CB8E9A" />
          <Text style={styles.locationText}>{locLoading ? 'Finding location...' : 'Current Location'}</Text>
        </View>
        <Text style={styles.heroTitle}>Find your perfect release.</Text>
        {locError ? <Text style={styles.locError}>{locError}</Text> : null}
      </View>

      <FlatList
        data={SERVICE_TYPES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.chipsWrap}
        renderItem={({ item }) => {
          const selected = serviceType === item;
          return (
            <Pressable
              onPress={() => setServiceType(item)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? '#F49278' : '#E7E4E0',
                },
              ]}>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{toDisplayService(item)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  const renderItem = ({ item, index }: { item: SearchProviderRow; index: number }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/(client)/provider/${item.provider_id}` as never)}
      style={({ pressed }) => [styles.providerCard, pressed && styles.providerCardPressed]}>
      <View style={styles.cardTop}>
        <View style={styles.profileArea}>
          <Avatar name={item.full_name} size={84} />
          <View style={styles.verifiedDot}>
            <FontAwesome name="certificate" size={11} color="#2E5A4D" />
          </View>
        </View>

        <View style={styles.infoArea}>
          <View style={styles.namePriceRow}>
            <Text style={styles.providerName} numberOfLines={1}>
              {item.full_name}
            </Text>
            <Text style={styles.priceText}>{formatCents(item.min_price_cents)}/hr</Text>
          </View>
          <View style={styles.subRow}>
            <Text style={styles.verifiedTag}>{item.is_verified ? 'LICENSED & VERIFIED' : 'ACTIVE PROVIDER'}</Text>
            <Text style={styles.distanceText}>{item.distance_miles.toFixed(1)} mi away</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.ratingBlock}>
          <FontAwesome name="star" size={13} color="#F39C8B" />
          <Text style={styles.ratingValue}>{item.average_rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({item.total_reviews} reviews)</Text>
        </View>

        <View style={styles.nextBlock}>
          <Text style={styles.nextLabel}>Next available:</Text>
          <Text style={styles.nextTime}>{NEXT_SLOTS[index % NEXT_SLOTS.length]}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeView style={styles.root}>
      {isError ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>{error instanceof Error ? error.message : 'Search failed.'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void refetch()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>Finding providers near you...</Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.provider_id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.stateText}>
              No providers nearby. Adjust filters and try again.
            </Text>
          }
        />
      )}

      <Pressable style={styles.floatingMapBtn}>
        <FontAwesome name="map" size={18} color="#FFFFFF" />
      </Pressable>
    </SafeView>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    root: { backgroundColor: '#F4F2EE' },
    listContent: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    brandText: { fontSize: 39 / 2, fontWeight: '800', color: '#5E3C4A', letterSpacing: -0.2 },
    searchBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: {
      backgroundColor: '#ECEAE7',
      borderRadius: 20,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    locationText: { color: '#5F5A54', fontSize: 16, fontWeight: '600' },
    heroTitle: {
      marginTop: spacing.sm,
      color: '#111111',
      fontSize: 56 / 2,
      lineHeight: 62 / 2,
      fontWeight: '800',
      maxWidth: 280,
      letterSpacing: -0.5,
    },
    locError: { marginTop: spacing.sm, color: t.error, fontSize: 13 },
    chipsWrap: { paddingBottom: spacing.md, gap: spacing.sm },
    chip: {
      paddingHorizontal: 20,
      minHeight: 44,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: { color: '#4A4640', fontSize: 24 / 2, fontWeight: '600' },
    chipTextActive: { color: '#4F2B24', fontWeight: '800' },
    providerCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: '#EEE9E2',
      shadowColor: 'rgba(40, 30, 20, 0.08)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 4,
    },
    providerCardPressed: { opacity: 0.95, transform: [{ scale: 0.995 }] },
    cardTop: { flexDirection: 'row' },
    profileArea: { width: 92, position: 'relative' },
    verifiedDot: {
      position: 'absolute',
      right: 6,
      bottom: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#C8E1D4',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoArea: { flex: 1 },
    namePriceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    providerName: { flex: 1, color: '#171717', fontSize: 34 / 2, fontWeight: '800' },
    priceText: { color: '#191919', fontSize: 34 / 2, fontWeight: '800', marginLeft: spacing.sm },
    subRow: {
      marginTop: spacing.xs,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    verifiedTag: {
      backgroundColor: '#F2D9D5',
      color: '#9A5A52',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      overflow: 'hidden',
    },
    distanceText: { color: '#58534E', fontSize: 14 },
    bottomRow: {
      marginTop: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ratingBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ratingValue: { color: '#221F1B', fontSize: 16, fontWeight: '800' },
    reviewCount: { color: '#66615A', fontSize: 14 },
    nextBlock: { alignItems: 'flex-end' },
    nextLabel: { color: '#67625B', fontSize: 14 },
    nextTime: { color: '#8B4B3D', fontSize: 31 / 2, fontWeight: '800' },
    stateWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
    stateText: { color: '#615C55', fontSize: 16, textAlign: 'center', lineHeight: 24 },
    retryBtn: {
      minHeight: 46,
      borderRadius: 999,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#A74D33',
    },
    retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    floatingMapBtn: {
      position: 'absolute',
      right: spacing.lg,
      bottom: 112,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: '#8E5862',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(50, 36, 38, 0.35)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 6,
    },
  });
}

function toDisplayService(type: ServiceType | 'all') {
  if (type === 'all') return 'All';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
