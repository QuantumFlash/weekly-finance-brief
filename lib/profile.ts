import { supabaseAdmin } from "./supabase/admin";

/** JS Date.getDay() convention everywhere: 0=Sunday .. 6=Saturday. */
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export interface Profile {
  user_id: string;
  delivery_day: number;
  /** Legacy column from the pre-card-gated trial era; no longer granted. */
  trial_ends_at: string | null;
  welcomed_at: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("user_id, delivery_day, trial_ends_at, welcomed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[profile] read failed:", error.message);
    return null;
  }
  return (data as Profile | null) ?? null;
}

export async function markWelcomed(userId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    console.error("[profile] welcomed_at update failed:", error.message);
  }
}
