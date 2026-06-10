import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isEntitled, syncSubscriptionForUser } from "../../../lib/billing";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Account — Weekly Finance Brief",
};

function StatusBadge({ status }: { status: string }) {
  const entitled = isEntitled(status);
  const label =
    status === "none" ? "No subscription" : status.replace(/_/g, " ");
  return (
    <span
      className={
        entitled
          ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "rounded-full bg-zinc-200 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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

  // Stripe is the source of truth — sync on every account view.
  const subscription = await syncSubscriptionForUser(user.id, user.email);
  const entitled = isEntitled(subscription.status);

  const { data: issues } = await supabase
    .from("issues")
    .select("week_label, subject, sent_at")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-24">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="text-sm font-medium uppercase tracking-widest text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Weekly Finance Brief
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </header>

        {params.checkout === "success" && (
          <p
            role="status"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-base text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            Subscription confirmed — welcome aboard. Your first brief arrives
            with the next weekly send.
          </p>
        )}
        {params.checkout === "cancelled" && (
          <p className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Checkout cancelled — no charge was made.
          </p>
        )}
        {(params.checkout === "error" || params.portal === "error") && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            Something went wrong with billing — please try again.
          </p>
        )}

        <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Subscription</h2>
          <dl className="flex flex-col gap-3 text-base">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
              <dd>
                <StatusBadge status={subscription.status} />
              </dd>
            </div>
            {subscription.current_period_end && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">
                  Current period ends
                </dt>
                <dd>
                  {new Date(
                    subscription.current_period_end,
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
          {entitled ? (
            <form action="/api/billing/portal" method="POST">
              <button
                type="submit"
                className="h-11 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Manage billing
              </button>
            </form>
          ) : (
            <form action="/api/billing/checkout" method="POST">
              <button
                type="submit"
                className="h-11 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Subscribe — $5/month
              </button>
            </form>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Recent issues</h2>
          {issues && issues.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {issues.map((issue) => (
                <li key={issue.week_label}>
                  <Link
                    href={`/issues/${issue.week_label}`}
                    className="text-base text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
                  >
                    {issue.week_label}: {issue.subject}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-zinc-500 dark:text-zinc-400">
              No issues sent yet — the first one lands with the next weekly
              run.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
