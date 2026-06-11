import type { Metadata } from "next";
import Link from "next/link";

import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

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
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <header className="mb-10 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Archive</h1>
          <p className="text-[15px] text-zinc-400">
            Every issue, free to read on the web.
          </p>
        </header>

        {issues && issues.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {issues.map((issue) => (
              <li key={issue.week_label}>
                <Link
                  href={`/issues/${issue.week_label}`}
                  className="group flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-emerald-400/30 hover:bg-white/[0.05]"
                >
                  <span className="text-sm text-zinc-500">
                    {issue.week_label}
                    {issue.sent_at &&
                      ` · ${new Date(issue.sent_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}`}
                  </span>
                  <span className="text-lg font-semibold text-zinc-100 transition-colors group-hover:text-emerald-200">
                    {issue.subject}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-[15px] text-zinc-400">
            No issues published yet — the first one is on its way.
          </p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
