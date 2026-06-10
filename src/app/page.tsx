import Link from "next/link";

import { WaitlistForm } from "@/components/WaitlistForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-12 px-6 py-24">
        <header className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Weekly Finance Brief
            </p>
            <nav className="flex items-center gap-5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              <Link
                href="/issues"
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Archive
              </Link>
              <Link
                href="/login"
                className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Sign in
              </Link>
            </nav>
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The week in markets, in five minutes.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            One plain-English brief every week: what happened, why it matters,
            and what to watch next. Written for busy people with investments —
            not finance professionals.
          </p>
        </header>

        <ul className="flex flex-col gap-3 text-base leading-7 text-zinc-700 dark:text-zinc-300">
          <li>
            <span className="font-semibold">What happened</span> — the week’s
            macro and market developments, without the noise.
          </li>
          <li>
            <span className="font-semibold">Why it matters</span> — plain
            English, jargon defined, numbers over adjectives.
          </li>
          <li>
            <span className="font-semibold">What to watch</span> — the
            releases and decisions that shape next week.
          </li>
        </ul>

        <section className="flex flex-col gap-3">
          <WaitlistForm />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Free while in beta. Educational content only — never personalised
            financial advice.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        © 2026 Weekly Finance Brief · Educational information, not investment
        advice.
      </footer>
    </div>
  );
}
