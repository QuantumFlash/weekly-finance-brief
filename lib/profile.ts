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

export const TRIAL_DAYS = 7;

export interface Profile {
  user_id: string;
  delivery_day: number;
  trial_ends_at: string | null;
  welcomed_at: string | null;
}

export function trialActive(profile: Pick<Profile, "trial_ends_at"> | null): boolean {
  if (!profile?.trial_ends_at) {
    return false;
  }
  return new Date(profile.trial_ends_at).getTime() > Date.now();
}

export function trialDaysLeft(profile: Pick<Profile, "trial_ends_at"> | null): number {
  if (!profile?.trial_ends_at) {
    return 0;
  }
  const ms = new Date(profile.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
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

/**
 * Creates the profile with a fresh 7-day trial, or — for an existing profile —
 * updates only the delivery day. Trials are never reset by re-signing up.
 */
export async function ensureTrialProfile(
  userId: string,
  deliveryDay: number,
): Promise<{ profile: Profile; isNew: boolean }> {
  const db = supabaseAdmin();
  const existing = await getProfile(userId);

  if (existing) {
    if (existing.delivery_day !== deliveryDay) {
      const { error } = await db
        .from("profiles")
        .update({ delivery_day: deliveryDay, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) {
        console.error("[profile] day update failed:", error.message);
      } else {
        existing.delivery_day = deliveryDay;
      }
    }
    return { profile: existing, isNew: false };
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
  const profile: Profile = {
    user_id: userId,
    delivery_day: deliveryDay,
    trial_ends_at: trialEndsAt,
    welcomed_at: null,
  };
  const { error } = await db.from("profiles").insert(profile);
  if (error) {
    throw new Error(`[profile] insert failed: ${error.message}`);
  }
  return { profile, isNew: true };
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
