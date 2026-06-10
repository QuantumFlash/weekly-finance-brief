import type { Metadata } from "next";
import Link from "next/link";

import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Archive — Weekly Finance Brief",
  description: "Every published issue of the Weekly Finance Brief.",
};

export const revalidate = 300;

export default async function IssuesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: issues } = await supabase
    .from("issues")
    .select("week_label, subject, sent_at")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-24">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="text-sm font-medium uppercase tracking-widest text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Weekly Finance Brief
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Archive</h1>
        </header>

        {issues && issues.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {issues.map((issue) => (
              <li key={issue.week_label}>
                <Link
                  href={`/issues/${issue.week_label}`}
                  className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
                >
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {issue.week_label}
                    {issue.sent_at &&
                      ` · ${new Date(issue.sent_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}`}
                  </span>
                  <span className="text-lg font-medium">{issue.subject}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            No issues published yet — the first one is on its way.
          </p>
        )}
      </main>
    </div>
  );
}
