import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { supabaseAdmin } from "../../../lib/supabase/admin";

export const metadata: Metadata = {
  title: "Ops — Weekly Finance Brief",
  robots: { index: false, follow: false },
};

/**
 * Minimal read-only ops dashboard (M4).
 * Access: signed-in user whose email matches ADMIN_EMAIL. Anyone else gets 404
 * (the page's existence is not advertised).
 */
export default async function AdminPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!adminEmail || !user || user.email !== adminEmail) {
    notFound();
  }

  const db = supabaseAdmin();
  const [runsRes, waitlistRes, subsRes, deliveriesRes] = await Promise.all([
    db
      .from("pipeline_runs")
      .select("id, started_at, finished_at, status, detail")
      .order("started_at", { ascending: false })
      .limit(10),
    db.from("waitlist_signups").select("id", { count: "exact", head: true }),
    db.from("subscriptions").select("status"),
    db
      .from("deliveries")
      .select("created_at, email, status, error")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const subStatuses = (subsRes.data ?? []).map((r) => r.status as string);
  const entitled = subStatuses.filter((s) =>
    ["active", "trialing", "past_due"].includes(s),
  ).length;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-24">
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm font-medium uppercase tracking-widest text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Weekly Finance Brief
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Ops</h1>
        </header>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Waitlist</p>
            <p className="text-2xl font-semibold">{waitlistRes.count ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Entitled subscribers
            </p>
            <p className="text-2xl font-semibold">{entitled}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Customer rows
            </p>
            <p className="text-2xl font-semibold">{subStatuses.length}</p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Pipeline runs</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {(runsRes.data ?? []).map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {new Date(run.started_at).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          run.status === "success"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : run.status === "running"
                              ? "text-zinc-500"
                              : "text-red-600 dark:text-red-400"
                        }
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {run.detail ?? "—"}
                    </td>
                  </tr>
                ))}
                {(runsRes.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                      No runs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Recent deliveries</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {(deliveriesRes.data ?? []).map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {new Date(d.created_at).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3">{d.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          d.status === "sent"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {d.error ?? "—"}
                    </td>
                  </tr>
                ))}
                {(deliveriesRes.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                      No deliveries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
