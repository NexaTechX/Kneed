import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { Provider, Profile, Service } from '@/types/database';

export type SearchProviderRow = {
  provider_id: string;
  distance_miles: number;
  min_price_cents: number;
  full_name: string;
  average_rating: number;
  total_reviews: number;
  is_verified: boolean;
};

export function useProviderSearch(params: {
  lat: number;
  lng: number;
  radiusMiles: number;
  serviceType?: string | null;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.providers(params),
    enabled: params.enabled !== false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_providers', {
        user_lat: params.lat,
        user_lng: params.lng,
        radius_miles: params.radiusMiles,
        filter_service_type: params.serviceType ?? null,
      });
      if (error) throw error;
      return (data ?? []) as SearchProviderRow[];
    },
  });
}

export type ProviderDetail = Provider & { profiles: Profile | null; services: Service[] | null };

export function useProviderDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.provider(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*, profiles(*), services(*)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProviderDetail;
    },
  });
}
