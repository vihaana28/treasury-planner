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
import type { Profile, SignupRequest } from "../types/domain";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  mySignupRequest: SignupRequest | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpWithRequest: (payload: {
    fullName: string;
    email: string;
    password: string;
    organizationId: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSignupRequest: () => Promise<void>;
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

async function fetchSignupRequest(userId: string): Promise<SignupRequest | null> {
  const requestResult = await supabase
    .from("signup_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (requestResult.error) {
    throw requestResult.error;
  }

  return (requestResult.data ?? null) as SignupRequest | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mySignupRequest, setMySignupRequest] = useState<SignupRequest | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    const userProfile = await fetchProfile(session.user.id);
    setProfile(userProfile);
  }, [session?.user?.id]);

  const refreshSignupRequest = useCallback(async () => {
    if (!session?.user?.id) {
      setMySignupRequest(null);
      return;
    }
    const request = await fetchSignupRequest(session.user.id);
    setMySignupRequest(request);
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
          const [userProfile, signupRequest] = await Promise.all([
            fetchProfile(sessionResult.data.session.user.id),
            fetchSignupRequest(sessionResult.data.session.user.id)
          ]);
          if (isMounted) {
            setProfile(userProfile);
            setMySignupRequest(signupRequest);
          }
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setProfile(null);
          setMySignupRequest(null);
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
        setMySignupRequest(null);
        return;
      }
      void Promise.all([
        fetchProfile(nextSession.user.id),
        fetchSignupRequest(nextSession.user.id)
      ]).then(([nextProfile, nextSignupRequest]) => {
        setProfile(nextProfile);
        setMySignupRequest(nextSignupRequest);
      });
    });

    return () => {
      isMounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        "Supabase is not configured. Add VITE_SUPABASE_URL and a public key env var."
      );
    }
    const result = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (result.error) {
      throw result.error;
    }
  }, []);

  const signUpWithRequest = useCallback(
    async (payload: {
      fullName: string;
      email: string;
      password: string;
      organizationId: string;
    }) => {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase is not configured. Add VITE_SUPABASE_URL and a public key env var."
        );
      }

      const signUpResult = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName
          }
        }
      });

      if (signUpResult.error) {
        throw signUpResult.error;
      }

      const userId = signUpResult.data.user?.id;
      if (!userId) {
        throw new Error("Signup succeeded but no user account id was returned.");
      }

      const requestUpsert = await supabase.from("signup_requests").upsert(
        {
          user_id: userId,
          organization_id: payload.organizationId,
          full_name: payload.fullName,
          email: payload.email.toLowerCase(),
          requested_role: "member",
          status: "pending",
          reviewed_at: null,
          reviewed_by: null,
          review_note: null
        },
        {
          onConflict: "user_id"
        }
      );

      if (requestUpsert.error) {
        throw requestUpsert.error;
      }

      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setMySignupRequest(null);
    },
    []
  );

  const signOut = useCallback(async () => {
    const result = await supabase.auth.signOut();
    if (result.error) {
      throw result.error;
    }
    setProfile(null);
    setSession(null);
    setMySignupRequest(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      profile,
      mySignupRequest,
      signIn,
      signUpWithRequest,
      signOut,
      refreshProfile,
      refreshSignupRequest
    }),
    [
      loading,
      session,
      profile,
      mySignupRequest,
      signIn,
      signUpWithRequest,
      signOut,
      refreshProfile,
      refreshSignupRequest
    ]
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
