import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "../env";

let cached: SupabaseClient | null = null;

/**
 * Admin Supabase client using the secret (service) key — SERVER ONLY.
 * Bypasses RLS. Used by billing sync, the weekly pipeline, and admin/ops.
 * Never import from client components.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
