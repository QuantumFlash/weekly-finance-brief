import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DAY_NAMES, getProfile } from "../../../lib/profile";
import { sendWelcomeEmailOnce } from "../../../lib/signup";
import { stripe } from "../../../lib/stripe";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Welcome — Weekly Finance Brief",
  robots: { index: false, follow: false },
};

/**
 * Post-checkout landing. Verifies the Checkout session server-side (no
 * webhook dependency), then sends the welcome email exactly once.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;
  if (!sessionId) {
    redirect("/");
  }

  let email: string | null = null;
  let userId: string | null = null;
  let trialing = false;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (session.status !== "complete") {
      redirect("/#signup");
    }
    email = session.customer_details?.email ?? null;
    userId = (session.metadata?.user_id as string | undefined) ?? null;
    const sub = session.subscription;
    trialing = typeof sub === "object" && sub !== null && sub.status === "trialing";
  } catch {
    redirect("/");
  }

  if (userId && email) {
    await sendWelcomeEmailOnce(userId, email);
  }
  const profile = userId ? await getProfile(userId) : null;
  const dayName = DAY_NAMES[profile?.delivery_day ?? 1];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />
      <main className="glow flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-400/25 bg-zinc-900/70 p-10 text-center shadow-2xl shadow-black/40 backdrop-blur">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-2xl">
            🎉
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">
            {trialing ? "Your free week has started" : "You’re subscribed"}
          </h1>
          <p className="mb-2 text-[15px] leading-7 text-zinc-300">
            Your first brief lands on <strong>{dayName}</strong> at 7am.
          </p>
          <p className="mb-8 text-[15px] leading-7 text-zinc-400">
            We’ve emailed you a welcome note with everything you need. Sign in
            anytime to change your delivery day or manage billing
            {trialing && " — cancel before day 7 and you won’t be charged"}
            .
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-300"
            >
              Sign in to your account
            </Link>
            <Link
              href="/issues"
              className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-white/25"
            >
              Browse the archive
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
