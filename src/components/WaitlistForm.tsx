"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalised = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalised)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalised }),
      });
      const data: { ok?: boolean; error?: string } = await res.json();
      if (res.ok && data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong — please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  if (status === "success") {
    return (
      <p
        role="status"
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-base text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      >
        You’re on the list — the first brief lands in your inbox soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
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
          {status === "submitting" ? "Joining…" : "Join the waitlist"}
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
