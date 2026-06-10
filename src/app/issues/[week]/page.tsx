import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { briefBodyHtml } from "../../../../lib/renderBrief";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

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
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-24">
        <header className="flex flex-col gap-3">
          <Link
            href="/issues"
            className="text-sm font-medium uppercase tracking-widest text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Archive
          </Link>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {issue.week_label}
            {issue.sent_at &&
              ` · ${new Date(issue.sent_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}`}
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            {issue.subject}
          </h1>
        </header>

        <article
          className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950 [&_h2]:!text-zinc-900 [&_li]:!text-zinc-700 [&_p]:!text-zinc-700 dark:[&_h2]:!text-zinc-100 dark:[&_li]:!text-zinc-300 dark:[&_p]:!text-zinc-300"
          // Safe: briefBodyHtml escapes all source text before adding markup.
          dangerouslySetInnerHTML={{ __html: briefBodyHtml(issue.body_markdown) }}
        />

        <footer className="text-sm text-zinc-500 dark:text-zinc-400">
          Educational information only — not investment advice. ·{" "}
          <Link href="/" className="underline underline-offset-4">
            Get this in your inbox weekly
          </Link>
        </footer>
      </main>
    </div>
  );
}
