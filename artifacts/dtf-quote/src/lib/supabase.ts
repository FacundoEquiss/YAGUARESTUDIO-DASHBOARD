import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const storageKey = "yaguar-auth";

type BrowserSupabaseClient = SupabaseClient;

declare global {
  interface Window {
    __yaguarSupabaseClient?: BrowserSupabaseClient;
  }
}

function getOrCreateSupabaseClient(): BrowserSupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Supabase client solo puede inicializarse en el navegador");
  }

  if (window.__yaguarSupabaseClient) {
    return window.__yaguarSupabaseClient;
  }

  if (!window.localStorage) {
    throw new Error("window.localStorage no está disponible para persistir la sesión");
  }

  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey,
      storage: window.localStorage,
    },
  });

  window.__yaguarSupabaseClient = client;

  return client;
}

export const supabase = isSupabaseConfigured
  ? getOrCreateSupabaseClient()
  : null;
