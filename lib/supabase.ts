import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

function isRealSupabaseConfig(url: string, key: string): boolean {
  if (!url || !key) return false;
  if (url.includes('your-project') || key === 'your-anon-key') return false;
  if (key.length < 80) return false;
  return true;
}

export const isSupabaseConfigured = isRealSupabaseConfig(supabaseUrl, supabaseAnonKey);

/** Placeholders so `createClient` never throws when env is missing (Expo loads routes on import). */
const PLACEHOLDER_URL = 'https://example.invalid/';
const PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.placeholder-not-configured';

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : PLACEHOLDER_URL,
  isSupabaseConfigured ? supabaseAnonKey : PLACEHOLDER_ANON_KEY,
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
  }
);
