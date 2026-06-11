import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isEntitled, syncSubscriptionForUser } from "../../../lib/billing";
import { DAY_NAMES, type Profile } from "../../../lib/profile";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Account — Weekly Finance Brief",
};

function StatusBadge({ label, good }: { label: string; good: boolean }) {
  return (
    <span
      className={
        good
          ? "rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-300"
          : "rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-zinc-300"
      }
    >
      {label}
    </span>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    redirect("/login");
  }

  const subscription = await syncSubscriptionForUser(user.id, user.email);
  const subEntitled = isEntitled(subscription.status);

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("user_id, delivery_day, trial_ends_at, welcomed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = (profileRow as Profile | null) ?? null;
  const deliveryDay = profile?.delivery_day ?? 1;
  const entitled = subEntitled;
  const trialing = subscription.status === "trialing";
  const periodEndText = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const { data: issues } = await supabase
    .from("issues")
    .select("week_label, subject, sent_at")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(5);

  const card =
    "rounded-3xl border border-white/10 bg-zinc-900/60 p-7 backdrop-blur";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-7 px-6 py-16">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-zinc-50"
            >
              Sign out
            </button>
          </form>
        </header>

        {params.checkout === "success" && (
          <p role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-[15px] text-emerald-200">
            Subscription confirmed — welcome aboard. Your next brief arrives on{" "}
            {DAY_NAMES[deliveryDay]}.
          </p>
        )}
        {params.checkout === "cancelled" && (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-[15px] text-zinc-300">
            Checkout cancelled — no charge was made.
          </p>
        )}
        {(params.checkout === "error" || params.portal === "error") && (
          <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-[15px] text-red-300">
            Something went wrong with billing — please try again.
          </p>
        )}
        {params.day === "saved" && (
          <p role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-[15px] text-emerald-200">
            Delivery day updated.
          </p>
        )}
        {(params.day === "error" || params.day === "invalid") && (
          <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-[15px] text-red-300">
            Couldn’t update your delivery day — please try again.
          </p>
        )}

        {/* Trial state (lives in Stripe: status === trialing) */}
        {trialing && (
          <div className="flex flex-col gap-3 rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.07] p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-emerald-200">
                Free trial active
              </h2>
              <StatusBadge good label="trialing" />
            </div>
            <p className="text-[15px] leading-7 text-zinc-300">
              You’re getting the full Weekly Finance Brief.
              {periodEndText &&
                ` Your trial converts to $5/month on ${periodEndText} —`}{" "}
              cancel anytime before then from “Manage billing” and you won’t
              be charged.
            </p>
          </div>
        )}
        {!entitled && (
          <div className="flex flex-col gap-3 rounded-3xl border border-amber-400/25 bg-amber-400/[0.06] p-7">
            <h2 className="text-lg font-semibold text-amber-200">
              No active subscription
            </h2>
            <p className="text-[15px] leading-7 text-zinc-300">
              Start your subscription to receive the brief on{" "}
              {DAY_NAMES[deliveryDay]}s. New members get the first week free
              ($0 today, card required).
            </p>
            <form action="/api/billing/checkout" method="POST">
              <button
                type="submit"
                className="h-11 rounded-xl bg-emerald-400 px-6 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-300"
              >
                Start — $5/month after free week
              </button>
            </form>
          </div>
        )}

        {/* Delivery day */}
        <section className={card}>
          <h2 className="mb-1 text-lg font-semibold">Delivery day</h2>
          <p className="mb-5 text-sm text-zinc-400">
            Your brief arrives every{" "}
            <span className="text-zinc-200">{DAY_NAMES[deliveryDay]}</span> at 7am.
          </p>
          <form action="/api/profile/day" method="POST" className="flex flex-wrap items-center gap-3">
            <label htmlFor="day-select" className="sr-only">
              Delivery day
            </label>
            <select
              id="day-select"
              name="day"
              defaultValue={deliveryDay}
              className="h-11 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3 text-[15px] text-zinc-100 outline-none focus:border-emerald-400/60 sm:max-w-56"
            >
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-11 rounded-xl border border-white/10 px-5 text-sm font-medium text-zinc-200 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
            >
              Save
            </button>
          </form>
        </section>

        {/* Subscription */}
        <section className={card}>
          <h2 className="mb-5 text-lg font-semibold">Subscription</h2>
          <dl className="flex flex-col gap-3.5 text-[15px]">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-400">Email</dt>
              <dd className="text-zinc-100">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-400">Status</dt>
              <dd>
                <StatusBadge
                  good={entitled}
                  label={
                    subEntitled
                      ? subscription.status.replace(/_/g, " ")
                      : "no subscription"
                  }
                />
              </dd>
            </div>
            {subscription.current_period_end && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-400">Current period ends</dt>
                <dd className="text-zinc-100">
                  {new Date(subscription.current_period_end).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </dd>
              </div>
            )}
          </dl>
          {subEntitled && (
            <form action="/api/billing/portal" method="POST" className="mt-5">
              <button
                type="submit"
                className="h-11 rounded-xl border border-white/10 px-5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/25"
              >
                Manage billing
              </button>
            </form>
          )}
        </section>

        {/* Recent issues */}
        <section className={card}>
          <h2 className="mb-5 text-lg font-semibold">Recent issues</h2>
          {issues && issues.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {issues.map((issue) => (
                <li key={issue.week_label}>
                  <Link
                    href={`/issues/${issue.week_label}`}
                    className="text-[15px] text-zinc-300 underline-offset-4 transition-colors hover:text-emerald-300 hover:underline"
                  >
                    <span className="text-zinc-500">{issue.week_label}</span>{" "}
                    {issue.subject}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-zinc-400">
              No issues published yet — your first one lands on{" "}
              {DAY_NAMES[deliveryDay]}.
            </p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
