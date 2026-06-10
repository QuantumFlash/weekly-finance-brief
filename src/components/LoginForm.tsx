"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type Status = "idle" | "submitting" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <p
        role="status"
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-base text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      >
        Check your inbox — we’ve emailed you a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="login-email" className="sr-only">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "submitting"}
          className="h-12 flex-1 rounded-lg border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-12 rounded-lg bg-zinc-900 px-6 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {status === "submitting" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
    </form>
  );
}
