import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
