import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

function isMissingTableError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist')
  );
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user ?? null;

  const fetchProfile = useCallback(async (userId) => {
    if (!isSupabaseConfigured) return;

    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116' && !isMissingTableError(error)) {
      console.error('Failed to fetch profile:', error.message);
    }

    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to load auth session:', error.message);
      }

      if (!mounted) return;
      setSession(data.session);
      await fetchProfile(data.session?.user?.id);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      fetchProfile(nextSession?.user?.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  async function signUp({ email, password, profileFields }) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: profileFields?.full_name,
        },
      },
    });

    if (error) throw error;

    if (data.user && profileFields) {
      try {
        await upsertProfile({
          id: data.user.id,
          email,
          ...profileFields,
        });
      } catch (profileError) {
        if (!isMissingTableError(profileError)) {
          throw profileError;
        }

        return {
          ...data,
          profileWarning:
            'Account created, but the database tables are not set up yet. Run supabase/schema.sql in your Supabase SQL Editor.',
        };
      }
    }

    return data;
  }

  async function signIn({ email, password }) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }

  async function upsertProfile(values) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }

    if (!values.id && !user?.id) {
      throw new Error('Cannot save a profile without a user id.');
    }

    const payload = {
      id: values.id ?? user.id,
      email: values.email ?? user?.email,
      full_name: values.full_name,
      school: values.school,
      year_level: values.year_level,
      program: values.program,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  }

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      upsertProfile,
      refreshProfile: () => fetchProfile(user?.id),
    }),
    [session, user, profile, loading, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
