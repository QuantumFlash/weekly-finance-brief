import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { briefBodyHtml } from "../../../../lib/renderBrief";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const revalidate = 300;

async function getIssue(week: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("issues")
    .select("week_label, subject, body_markdown, sent_at")
    .eq("status", "sent")
    .eq("week_label", week)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  const issue = await getIssue(week);
  return {
    title: issue
      ? `${issue.subject} — Weekly Finance Brief ${issue.week_label}`
      : "Issue not found — Weekly Finance Brief",
  };
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const issue = await getIssue(week);
  if (!issue) {
    notFound();
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <header className="mb-8 flex flex-col gap-3">
          <Link
            href="/issues"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-emerald-300"
          >
            ← Archive
          </Link>
          <p className="text-sm text-zinc-500">
            {issue.week_label}
            {issue.sent_at &&
              ` · ${new Date(issue.sent_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}`}
          </p>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {issue.subject}
          </h1>
        </header>

        <article
          className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-900 shadow-2xl shadow-black/40 sm:p-10"
          // Safe: briefBodyHtml escapes all source text before adding markup.
          dangerouslySetInnerHTML={{ __html: briefBodyHtml(issue.body_markdown) }}
        />

        <footer className="mt-8 flex flex-col items-start gap-4">
          <p className="text-sm text-zinc-500">
            Educational information only — not investment advice.
          </p>
          <Link
            href="/#signup"
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-300"
          >
            Get this in your inbox — free for a week
          </Link>
        </footer>
      </main>
      <SiteFooter />
    </div>
  );
}
