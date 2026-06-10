import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * User-scoped Supabase client for server components and route handlers.
 * Uses the publishable (anon) key + the user's session cookies, so RLS applies.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component where cookie writes are not
            // allowed. Safe to ignore: session refresh writes happen in
            // route handlers (e.g. /auth/callback) instead.
          }
        },
      },
    },
  );
}
