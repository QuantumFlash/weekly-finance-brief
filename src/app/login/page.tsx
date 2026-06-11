import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/LoginForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Sign in — Weekly Finance Brief",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hadError = params.error === "auth";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />
      <main className="glow flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="mb-7 flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-[15px] leading-7 text-zinc-400">
              No password needed — we’ll email you a magic link.
            </p>
          </div>
          {hadError && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
            >
              That sign-in link didn’t work (it may have expired). Please
              request a new one.
            </p>
          )}
          <LoginForm />
          <p className="mt-6 text-center text-sm text-zinc-500">
            New here?{" "}
            <Link
              href="/#signup"
              className="font-medium text-emerald-300 underline-offset-4 hover:underline"
            >
              Start your free week
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
