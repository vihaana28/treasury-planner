import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://example.supabase.co";
const supabasePublicKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.public-anon-key";

export const isSupabaseConfigured =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

export const supabase = createClient(supabaseUrl, supabasePublicKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
