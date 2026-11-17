import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

/**
 * Singleton Supabase client for server-side data operations (PostgREST over HTTPS).
 * This does NOT use cookie-based auth — it uses the publishable key for data access.
 * Tables must have RLS disabled (default when created via SQL Editor) for this to work.
 *
 * If env vars are missing, exports a placeholder client so the app doesn't crash.
 * API calls will return errors until valid credentials are provided.
 */
export const supabase: SupabaseClient = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : ({} as SupabaseClient); // placeholder — API calls will fail gracefully

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
