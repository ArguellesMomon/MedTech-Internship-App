import { demoClient, isDemoMode } from './demo';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseCredentials =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key');

export const isSupabaseConfigured = hasSupabaseCredentials || isDemoMode();

if (!isSupabaseConfigured) {
  console.warn(
    'Missing Supabase environment variables. Copy .env.example to .env and add your project URL and anon key.',
  );
}

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackAnonKey = 'placeholder-anon-key';

export const supabase = isDemoMode()
  ? demoClient
  : createClient(
      hasSupabaseCredentials ? supabaseUrl : fallbackUrl,
      hasSupabaseCredentials ? supabaseAnonKey : fallbackAnonKey,
    );
