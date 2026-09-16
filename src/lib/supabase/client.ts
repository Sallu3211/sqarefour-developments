import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "squarefour-auth",
    },
  });
}

/**
 * Only ever access this after checking `isSupabaseConfigured`, or from code
 * paths that already require an authenticated session (auth gate guarantees
 * configuration by that point).
 */
export const supabase = client as SupabaseClient;
