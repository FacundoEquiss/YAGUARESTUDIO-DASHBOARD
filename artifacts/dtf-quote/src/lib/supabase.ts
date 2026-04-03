import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const storageKey = "yaguar-auth";
const authStorage = typeof window !== "undefined" ? window.localStorage : undefined;

type SupabaseClientInstance = any;

declare global {
  interface Window {
    __yaguarSupabaseClient?: unknown;
  }
}

function getOrCreateSupabaseClient(): SupabaseClientInstance {
  if (typeof window !== "undefined" && window.__yaguarSupabaseClient) {
    return window.__yaguarSupabaseClient as SupabaseClientInstance;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey,
      storage: authStorage,
    },
  });

  if (typeof window !== "undefined") {
    window.__yaguarSupabaseClient = client;
  }

  return client;
}

export const supabase = isSupabaseConfigured
  ? getOrCreateSupabaseClient()
  : null;
