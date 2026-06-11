import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

/**
 * POST /api/profile/day — change delivery day (plain form post from /account).
 * Uses the user-scoped client: the "update own profile" RLS policy enforces
 * ownership; no service key involved.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const origin = new URL(request.url).origin;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin), 303);
  }

  const form = await request.formData();
  const day = Number(form.get("day"));
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return NextResponse.redirect(new URL("/account?day=invalid", origin), 303);
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ delivery_day: day, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select("user_id");
  if (error) {
    console.error("[profile/day] update failed:", error.message);
    return NextResponse.redirect(new URL("/account?day=error", origin), 303);
  }

  // Accounts that predate the profiles table have no row yet (RLS has no
  // insert policy by design) — create one server-side, without a trial.
  if (!updated || updated.length === 0) {
    const { supabaseAdmin } = await import("../../../../../lib/supabase/admin");
    const { error: insertError } = await supabaseAdmin().from("profiles").insert({
      user_id: user.id,
      delivery_day: day,
      trial_ends_at: null,
    });
    if (insertError) {
      console.error("[profile/day] legacy insert failed:", insertError.message);
      return NextResponse.redirect(new URL("/account?day=error", origin), 303);
    }
  }
  return NextResponse.redirect(new URL("/account?day=saved", origin), 303);
}
