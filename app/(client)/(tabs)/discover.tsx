import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeView } from '@/components/layout/SafeView';
import { KneadMark } from '@/components/branding/KneadMark';
import { ProviderListCard } from '@/components/provider/ProviderListCard';
import { FilterRow, type FilterOption } from '@/components/ui/FilterRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { FloatingMapButton } from '@/components/ui/FloatingMapButton';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fonts, textStyles } from '@/constants/typography';
import { config } from '@/constants/config';
import { useProviderSearch, type SearchProviderRow } from '@/hooks/useProviders';
import type { ServiceType } from '@/types/database';

const FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: 'All' },
  { key: 'swedish', label: 'Swedish' },
  { key: 'deep_tissue', label: 'Deep Tissue' },
  { key: 'sports', label: 'Sports' },
  { key: 'thai', label: 'Thai' },
  { key: 'prenatal', label: 'Prenatal' },
];

export default function DiscoverScreen() {
  const [lat, setLat] = useState('37.7749');
  const [lng, setLng] = useState('-122.4194');
  const [radius, setRadius] = useState(String(config.defaultSearchRadiusMiles));
  const [serviceKey, setServiceKey] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const serviceType: ServiceType | 'all' | null =
    serviceKey === 'all' ? 'all' : (serviceKey as ServiceType);

  const params = useMemo(
    () => ({
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      radiusMiles: parseFloat(radius) || config.defaultSearchRadiusMiles,
      serviceType: serviceType === 'all' || !serviceType ? null : serviceType,
    }),
    [lat, lng, radius, serviceType],
  );

  const { data, isLoading, refetch, isRefetching } = useProviderSearch(params);

  const renderItem = ({ item }: { item: SearchProviderRow }) => (
    <ProviderListCard row={item} nextAvailableLabel={undefined} />
  );

  const listEmpty = !isLoading && (data?.length ?? 0) === 0;

  return (
    <SafeView>
      <View style={styles.topBar}>
        <KneadMark size="md" />
        <Pressable
          onPress={() => Alert.alert('Search', 'Search is coming soon.')}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Search">
          <FontAwesome name="search" size={22} color={colors.brown} />
        </Pressable>
      </View>

      <Text style={[textStyles.heroSerif, styles.headline]}>Find your perfect release</Text>

      <Pressable
        style={styles.locCard}
        onPress={() => setShowAdvanced((s) => !s)}
        accessibilityRole="button">
        <View style={styles.locIcon}>
          <FontAwesome name="map-marker" size={20} color={colors.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.locTitle}>Current location</Text>
          <Text style={styles.locSub}>
            {lat.trim()}, {lng.trim()} · {radius} mi radius
          </Text>
        </View>
        <FontAwesome name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={16} color={colors.stone} />
      </Pressable>

      {showAdvanced ? (
        <View style={styles.advanced}>
          <Text style={styles.advLabel}>Latitude</Text>
          <Input value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
          <Text style={styles.advLabel}>Longitude</Text>
          <Input value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
          <Text style={styles.advLabel}>Radius (miles)</Text>
          <Input value={radius} onChangeText={setRadius} keyboardType="decimal-pad" />
        </View>
      ) : null}

      <View style={styles.filterBlock}>
        <Text style={[textStyles.overline, styles.filterLabel]}>Treatment type</Text>
        <FilterRow options={FILTER_OPTIONS} value={serviceKey} onChange={setServiceKey} />
      </View>

      {isLoading ? (
        <Text style={styles.muted}>Searching…</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.provider_id}
          renderItem={renderItem}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            listEmpty ? (
              <EmptyState
                title="No therapists nearby"
                subtitle="Try widening your search radius or pick a different treatment."
                actionLabel="Change location"
                onAction={() => setShowAdvanced(true)}
                illustration={
                  <FontAwesome name="user-md" size={48} color={colors.dustyRoseCard} />
                }
              />
            ) : null
          }
        />
      )}
      <FloatingMapButton />
    </SafeView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  locIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.badgePink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.brown,
  },
  locSub: {
    marginTop: 2,
    fontSize: 13,
    color: colors.stone,
  },
  advanced: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  advLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.stone,
    marginTop: spacing.xs,
  },
  filterBlock: {
    paddingLeft: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterLabel: { marginBottom: spacing.xs },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    flexGrow: 1,
  },
  muted: { color: colors.stone, padding: spacing.lg },
});
