import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeView } from '@/components/layout/SafeView';
import { Input } from '@/components/ui/Input';
import { ProviderCard } from '@/components/provider/ProviderCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { config } from '@/constants/config';
import { useProviderSearch, type SearchProviderRow } from '@/hooks/useProviders';
import type { ServiceType } from '@/types/database';

const SERVICE_TYPES: (ServiceType | 'all')[] = ['all', 'swedish', 'deep_tissue', 'sports', 'thai', 'prenatal'];

export default function DiscoverScreen() {
  const [lat, setLat] = useState('37.7749');
  const [lng, setLng] = useState('-122.4194');
  const [radius, setRadius] = useState(String(config.defaultSearchRadiusMiles));
  const [serviceType, setServiceType] = useState<ServiceType | 'all' | null>('all');

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
    <ProviderCard row={item} nextSlotLabel={undefined} />
  );

  return (
    <SafeView>
      <Text style={styles.title}>Discover</Text>
      <ScrollView contentContainerStyle={styles.filters} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Latitude</Text>
        <Input value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
        <Text style={styles.label}>Longitude</Text>
        <Input value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
        <Text style={styles.label}>Radius (miles)</Text>
        <Input value={radius} onChangeText={setRadius} keyboardType="decimal-pad" />
        <Text style={styles.label}>Service type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {SERVICE_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setServiceType(t)}
              style={[styles.chip, serviceType === t && styles.chipOn]}>
              <Text style={[styles.chipText, serviceType === t && styles.chipTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>
      {isLoading ? (
        <Text style={styles.muted}>Searching…</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.provider_id}
          renderItem={renderItem}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
          ListEmptyComponent={<Text style={styles.muted}>No providers nearby. Adjust filters and try again.</Text>}
        />
      )}
    </SafeView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.charcoal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  filters: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.stone },
  chips: { flexDirection: 'row', marginVertical: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dustyrose,
    marginRight: spacing.sm,
  },
  chipOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipText: { color: colors.charcoal, fontSize: 13 },
  chipTextOn: { color: colors.white, fontWeight: '600' },
  muted: { color: colors.stone, padding: spacing.lg },
});
