import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service role key (bypasses RLS).
 * Use only in Route Handlers / Server Actions — never import in client components.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
