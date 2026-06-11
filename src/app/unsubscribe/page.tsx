import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Unsubscribe — Weekly Finance Brief",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = params.status;

  const isDone = status === "done";
  const isInvalid = status === "invalid";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/70 p-10 text-center shadow-2xl shadow-black/40 backdrop-blur">
          {isDone ? (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-xl">
                ✓
              </div>
              <h1 className="mb-3 text-2xl font-semibold">
                You've been unsubscribed
              </h1>
              <p className="mb-7 text-[15px] leading-7 text-zinc-400">
                Your subscription has been cancelled. You won't receive any
                more briefs. If you change your mind, you're welcome back
                anytime.
              </p>
              <Link
                href="/"
                className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-white/25"
              >
                Back to home
              </Link>
            </>
          ) : isInvalid ? (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-400/15 text-xl">
                ✗
              </div>
              <h1 className="mb-3 text-2xl font-semibold">Invalid link</h1>
              <p className="mb-7 text-[15px] leading-7 text-zinc-400">
                This unsubscribe link is invalid or has expired. Sign in to
                your account to manage your subscription.
              </p>
              <Link
                href="/login"
                className="rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-300"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-400/15 text-xl">
                !
              </div>
              <h1 className="mb-3 text-2xl font-semibold">
                Something went wrong
              </h1>
              <p className="mb-7 text-[15px] leading-7 text-zinc-400">
                We couldn't process your unsubscribe request. Please try
                again or manage your subscription from your account.
              </p>
              <Link
                href="/account"
                className="rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-300"
              >
                Go to account
              </Link>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
