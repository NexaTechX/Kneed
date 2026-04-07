import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export function useEntryRedirect(): { href: string | null; isLoading: boolean } {
  const { user, profile, isLoading: authLoading } = useAuth();

  const { data: provider, isLoading: provLoading } = useQuery({
    queryKey: ['provider-row', user?.id],
    enabled: Boolean(user && profile?.role === 'provider'),
    queryFn: async () => {
      const { data, error } = await supabase.from('providers').select('*').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (authLoading) return { href: null, isLoading: true };
  if (!user) return { href: '/(auth)/welcome', isLoading: false };

  if (!profile?.full_name?.trim()) {
    return { href: '/(onboarding)/profile-setup', isLoading: false };
  }

  if (profile.role === 'provider') {
    if (provLoading) return { href: null, isLoading: true };
    if (!provider?.license_image) {
      return { href: '/(onboarding)/provider-verify', isLoading: false };
    }
    return { href: '/(provider)/dashboard', isLoading: false };
  }

  return { href: '/(client)/(tabs)/discover', isLoading: false };
}
