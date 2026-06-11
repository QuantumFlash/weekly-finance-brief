import Link from "next/link";

import { SignupForm } from "@/components/SignupForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

function MockBrief() {
  return (
    <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">
            This week’s brief
          </span>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
          5 min read
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-emerald-300">
            What happened this week
          </p>
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-11/12 rounded bg-white/10" />
            <div className="h-2 w-4/5 rounded bg-white/10" />
            <div className="h-2 w-10/12 rounded bg-white/[0.07]" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-emerald-300">
            Why it matters
          </p>
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-full rounded bg-white/10" />
            <div className="h-2 w-9/12 rounded bg-white/[0.07]" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-emerald-300">
            What to watch next
          </p>
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-10/12 rounded bg-white/10" />
            <div className="h-2 w-7/12 rounded bg-white/[0.07]" />
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-white/5 pt-4">
        <p className="text-[10px] leading-4 text-zinc-500">
          Every figure traced to a public source · Plain English · No hype
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="glow relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-28">
            <div className="flex flex-col items-start gap-6">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
                7 days free · $0 today · Cancel anytime
              </span>
              <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                The week in markets,{" "}
                <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                  explained in five minutes.
                </span>
              </h1>
              <p className="max-w-xl text-lg leading-8 text-zinc-400">
                One plain-English brief, delivered on the day you choose. What
                happened, why it matters, and what to watch next — for busy
                people with investments, not finance professionals.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="#signup"
                  className="rounded-xl bg-emerald-400 px-6 py-3.5 text-base font-semibold text-emerald-950 transition-all hover:bg-emerald-300 hover:shadow-[0_0_32px_rgba(52,211,153,0.4)]"
                >
                  Start my free week
                </Link>
                <Link
                  href="/issues"
                  className="rounded-xl border border-white/10 px-6 py-3.5 text-base font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-zinc-50"
                >
                  Read a real issue →
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <MockBrief />
            </div>
          </div>
        </section>

        {/* The three sections */}
        <section className="border-t border-white/5">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-20 md:grid-cols-3">
            {[
              {
                title: "What happened",
                body: "The week’s macro and market developments, distilled from official sources and hard data — without the noise.",
              },
              {
                title: "Why it matters",
                body: "Plain English, jargon defined on first use, numbers over adjectives. Written for orientation, not adrenaline.",
              },
              {
                title: "What to watch",
                body: "The releases and decisions shaping next week — framed as things to watch, never as predictions or advice.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-7 transition-colors hover:border-emerald-400/20"
              >
                <h3 className="mb-2.5 text-lg font-semibold text-zinc-50">
                  {f.title}
                </h3>
                <p className="text-[15px] leading-7 text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About us */}
        <section className="border-t border-white/5">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-3xl font-semibold tracking-tight">
              About us
            </h2>
            <div className="flex flex-col gap-4 text-[15px] leading-8 text-zinc-400">
              <p>
                Weekly Finance Brief is an independent publication with one
                job: keep you oriented on macro and markets in the time it
                takes to drink a coffee. No streams of breaking news, no hot
                takes, no portfolio tips — just one carefully assembled recap
                of the week, every week.
              </p>
              <p>
                Every issue is built the same way: we collect official
                releases and hard economic data from public sources (the
                Federal Reserve, FRED), every claim is pinned to where it came
                from, and every number is traceable. If a week is quiet, your
                brief is shorter — we don’t pad.
              </p>
              <p className="text-zinc-500">
                Educational information only. We are not licensed advisors and
                nothing here is investment advice or a recommendation to buy
                or sell anything.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-white/5">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2 className="mb-12 text-3xl font-semibold tracking-tight">
              How it works
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Sign up & pick your day",
                  body: "Your email, your weekday, and a card on file (nothing charged for 7 days) — Monday coffee or Sunday reset, your call.",
                },
                {
                  step: "02",
                  title: "We read the week",
                  body: "Official statements, speeches, and key indicators get collected, cross-checked, and distilled into one honest recap.",
                },
                {
                  step: "03",
                  title: "It lands in your inbox",
                  body: "Every week on your chosen day at 7am — and on the web archive. After your free week it’s $5/month, cancel anytime.",
                },
              ].map((s) => (
                <div key={s.step} className="flex flex-col gap-3">
                  <span className="text-sm font-mono font-medium text-emerald-400">
                    {s.step}
                  </span>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="text-[15px] leading-7 text-zinc-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Signup */}
        <section id="signup" className="glow border-t border-white/5">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
            <div className="flex flex-col gap-4">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Try a week on us.
              </h2>
              <p className="max-w-md text-lg leading-8 text-zinc-400">
                Sign up in ten seconds. Your welcome email arrives immediately
                — your first brief arrives on the day you choose.
              </p>
              <ul className="mt-2 flex flex-col gap-2.5 text-[15px] text-zinc-300">
                {[
                  "7-day free trial — $0 today, secured by card",
                  "Pick your delivery day, change it anytime",
                  "$5/month after — cancel in two clicks, anytime",
                ].map((li) => (
                  <li key={li} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-[11px] text-emerald-300">
                      ✓
                    </span>
                    {li}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
              <SignupForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
