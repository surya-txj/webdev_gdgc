import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { configureApi, get } from '../lib/api';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co', import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder');
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = async (redirect = true) => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    if (redirect) navigate('/login');
  };

  useEffect(() => {
    let mounted = true;
    const loadSession = async (currentSession) => {
      if (!mounted) return;
      configureApi({
        token: () => currentSession?.access_token || null,
        unauthorized: () => { if (mounted && currentSession) void signOut(false); }
      });
      setSession(currentSession);
      if (!currentSession) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const currentProfile = await get('/me');
        if (mounted) setProfile(currentProfile);
      } catch {
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => loadSession(data.session)).catch(() => loadSession(null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => { void loadSession(currentSession); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const value = useMemo(() => ({ session, profile, loading, supabase, signOut, refreshProfile: async () => setProfile(await get('/me')) }), [session, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
