import { type Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Profile } from "../types/domain";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const profileResult = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileResult.error) {
    throw profileResult.error;
  }

  return (profileResult.data ?? null) as Profile | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    const userProfile = await fetchProfile(session.user.id);
    setProfile(userProfile);
  }, [session?.user?.id]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap(): Promise<void> {
      try {
        if (!isSupabaseConfigured) {
          setLoading(false);
          return;
        }

        const sessionResult = await supabase.auth.getSession();
        if (sessionResult.error) {
          throw sessionResult.error;
        }

        if (!isMounted) {
          return;
        }

        setSession(sessionResult.data.session);
        if (sessionResult.data.session?.user?.id) {
          const userProfile = await fetchProfile(sessionResult.data.session.user.id);
          if (isMounted) {
            setProfile(userProfile);
          }
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    const authSubscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user?.id) {
        setProfile(null);
        return;
      }
      void fetchProfile(nextSession.user.id).then((nextProfile) => setProfile(nextProfile));
    });

    return () => {
      isMounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const result = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (result.error) {
      throw result.error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const result = await supabase.auth.signOut();
    if (result.error) {
      throw result.error;
    }
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      profile,
      signIn,
      signOut,
      refreshProfile
    }),
    [loading, session, profile, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
