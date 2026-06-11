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
        className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-base text-emerald-200"
      >
        Check your inbox — we’ve emailed you a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-base text-zinc-50 outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-400/60 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.15)] disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="h-12 rounded-xl bg-emerald-400 text-base font-semibold text-emerald-950 transition-all hover:bg-emerald-300 disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-400">
          {message}
        </p>
      )}
    </form>
  );
}
