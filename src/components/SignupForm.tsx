"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DAYS: Array<{ index: number; short: string; full: string }> = [
  { index: 1, short: "Mon", full: "Monday" },
  { index: 2, short: "Tue", full: "Tuesday" },
  { index: 3, short: "Wed", full: "Wednesday" },
  { index: 4, short: "Thu", full: "Thursday" },
  { index: 5, short: "Fri", full: "Friday" },
  { index: 6, short: "Sat", full: "Saturday" },
  { index: 0, short: "Sun", full: "Sunday" },
];

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [day, setDay] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const selectedDay = DAYS.find((d) => d.index === day)!;

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
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalised, deliveryDay: day }),
      });
      const data: { ok?: boolean; url?: string; error?: string } = await res.json();
      if (res.ok && data.ok && data.url) {
        setStatus("success");
        // Off to Stripe: card secured there, $0 due today on the trial.
        window.location.href = data.url;
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
      <div
        role="status"
        className="flex flex-col gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6"
      >
        <p className="text-lg font-semibold text-emerald-300">
          Taking you to secure checkout…
        </p>
        <p className="text-sm leading-6 text-zinc-300">
          Card details are handled by Stripe. Nothing is charged today — your
          first brief lands on <strong>{selectedDay.full}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="signup-email"
          className="text-sm font-medium text-zinc-300"
        >
          Email address
        </label>
        <input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "submitting"}
          className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-base text-zinc-50 outline-none transition-all placeholder:text-zinc-500 focus:border-emerald-400/60 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(52,211,153,0.15)] disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-300">
          Which day should your brief arrive?
        </span>
        <div
          role="radiogroup"
          aria-label="Delivery day"
          className="grid grid-cols-7 gap-1.5"
        >
          {DAYS.map((d) => (
            <button
              key={d.index}
              type="button"
              role="radio"
              aria-checked={day === d.index}
              onClick={() => setDay(d.index)}
              disabled={status === "submitting"}
              className={
                day === d.index
                  ? "h-11 rounded-xl bg-emerald-400 text-sm font-semibold text-emerald-950 shadow-[0_0_16px_rgba(52,211,153,0.3)] transition-all"
                  : "h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-zinc-400 transition-all hover:border-white/20 hover:text-zinc-200"
              }
            >
              {d.short}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          Arrives every <span className="text-zinc-300">{selectedDay.full}</span> at
          7am. Change it anytime from your account.
        </p>
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="h-12 rounded-xl bg-emerald-400 text-base font-semibold text-emerald-950 transition-all hover:bg-emerald-300 hover:shadow-[0_0_28px_rgba(52,211,153,0.35)] disabled:opacity-60"
      >
        {status === "submitting" ? "Setting up your free week…" : "Start my free week"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        7 days free · $0 today, card required · Cancel anytime before day 7
      </p>
      {status === "error" && (
        <p role="alert" className="text-sm text-red-400">
          {message}
        </p>
      )}
    </form>
  );
}
