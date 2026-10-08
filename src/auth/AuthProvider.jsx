import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { AuthContext } from './AuthContext';
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const user = session?.user || null;
  const fetchProfile = useCallback(async (userId) => {
    const request = ++requestId.current;
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (request === requestId.current) setProfile(data || null);
    } catch (error) {
      console.error('Profile could not load', error);
      if (request === requestId.current) setProfile(null);
    }
  }, []);
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setSession(data.session);
      })
      .catch((error) => console.error('Session could not load', error))
      .finally(() => {
        if (active) setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  const invalidateProfile = useCallback(() => {
    requestId.current++;
  }, []);
  useEffect(() => {
    setProfile(null);
    fetchProfile(user?.id);
    return invalidateProfile;
  }, [user?.id, fetchProfile, invalidateProfile]);
  function requireSetup() {
    if (!isSupabaseConfigured)
      throw new Error('Account sign-in is currently unavailable. Please try again later.');
  }
  async function upsertProfile(values) {
    requireSetup();
    const id = values.id || user?.id;
    if (!id) throw new Error('Please sign in before saving your profile.');
    const allowed = [
      'full_name',
      'school',
      'year_level',
      'program',
      'avatar_url',
      'internship_start_date',
    ];
    const payload = {
      id,
      email: values.email || user?.email,
      updated_at: new Date().toISOString(),
    };
    for (const key of allowed) {
      if (values[key] !== undefined)
        payload[key] = key === 'internship_start_date' ? values[key] || null : values[key];
    }
    const { data, error } = await supabase.from('profiles').upsert(payload).select().single();
    if (error) throw error;
    setProfile(data);
    return data;
  }
  async function signUp({ email, password, profileFields }) {
    requireSetup();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: profileFields || {} },
    });
    if (error) throw error;
    if (data.session && data.user && profileFields) {
      try {
        await upsertProfile({ id: data.user.id, email, ...profileFields });
      } catch (error) {
        console.error('Initial profile save failed', error);
        return {
          ...data,
          profileWarning: 'Your account was created. You can finish your profile after signing in.',
        };
      }
    }
    return data;
  }
  async function signIn({ email, password }) {
    requireSetup();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setProfile(null);
  }
  // Seed the profile after an email-confirmed first login, when RLS permits writes.
  useEffect(() => {
    if (!user?.id || !user.user_metadata?.full_name) return;
    let active = true;
    async function ensureProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (error || data || !active) return;
      const fields = user.user_metadata;
      const { error: saveError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: fields.full_name,
        school: fields.school,
        year_level: fields.year_level,
        program: fields.program,
      });
      if (!saveError && active) fetchProfile(user.id);
    }
    ensureProfile();
    return () => {
      active = false;
    };
  }, [user?.id, user?.email, user?.user_metadata, fetchProfile]);
  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        upsertProfile,
        refreshProfile: () => fetchProfile(user?.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
