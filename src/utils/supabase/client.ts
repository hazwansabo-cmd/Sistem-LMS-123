import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Create a Supabase browser client for use in Client Components.
 * Works over HTTPS (PostgREST) - no direct database port access needed.
 */
export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!);
