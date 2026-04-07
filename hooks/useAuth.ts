import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchProfile } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

export function useAuthBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(session);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (!cancelled) setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    void hydrate();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [setLoading, setProfile, setSession]);
}

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  return { session, profile, isLoading, user: session?.user ?? null };
}

export async function signOut() {
  await supabase.auth.signOut();
}
