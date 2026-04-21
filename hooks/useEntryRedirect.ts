import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export function useEntryRedirect(): { href: string | null; isLoading: boolean } {
  const { user, profile, isLoading: authLoading } = useAuth();

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ['admin-role-check', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_roles').select('role').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  if (authLoading) return { href: null, isLoading: true };
  if (!user) return { href: '/(auth)/welcome', isLoading: false };

  if (!profile?.full_name?.trim()) {
    return { href: '/(onboarding)/profile-setup', isLoading: false };
  }

  if (adminLoading) return { href: null, isLoading: true };
  if (isAdmin) {
    return { href: '/admin-web', isLoading: false };
  }

  return { href: '/(client)/(tabs)/feed', isLoading: false };
}
