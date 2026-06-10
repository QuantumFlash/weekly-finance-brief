import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/LoginForm";

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
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-24">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="text-sm font-medium uppercase tracking-widest text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Weekly Finance Brief
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            No password needed — we’ll email you a magic link.
          </p>
        </header>
        {hadError && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            That sign-in link didn’t work (it may have expired). Please request
            a new one.
          </p>
        )}
        <LoginForm />
      </main>
    </div>
  );
}
