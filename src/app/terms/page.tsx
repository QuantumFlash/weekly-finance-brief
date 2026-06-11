import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Terms of Service — Weekly Finance Brief",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
      <div className="flex flex-col gap-2 text-[15px] leading-7 text-zinc-400">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <header className="mb-10 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-zinc-500">Last updated: June 2026</p>
        </header>

        <div className="flex flex-col gap-8">
          <Section title="1. The service">
            <p>
              Weekly Finance Brief is an educational newsletter subscription. We
              publish one brief per week covering macro-economic developments and
              financial markets. We deliver it by email and make each issue
              available on our website.
            </p>
          </Section>

          <Section title="2. Not financial advice">
            <p className="font-medium text-zinc-200">
              Weekly Finance Brief is educational information only. Nothing we
              publish is investment advice, a recommendation to buy or sell any
              security, or personalised financial guidance of any kind.
            </p>
            <p>
              We are not licensed financial advisors. You should not make
              investment decisions based solely on our content. Always consult a
              qualified financial professional before making investment decisions.
            </p>
          </Section>

          <Section title="3. Subscription and billing">
            <p>
              We offer a 7-day free trial for new subscribers. Your card is
              charged nothing during the trial. If you do not cancel before the
              trial ends, your subscription automatically converts to the current
              monthly rate (shown at checkout).
            </p>
            <p>
              Payments are processed by Stripe. You can cancel your subscription
              at any time from your account page — cancellation takes effect at
              the end of the current billing period. We do not offer refunds for
              partial billing periods.
            </p>
            <p>
              We reserve the right to change prices with 30 days' notice to
              current subscribers.
            </p>
          </Section>

          <Section title="4. Your account">
            <p>
              You are responsible for maintaining the security of your account.
              We use Supabase for authentication and never store passwords. Access
              is via email link only. Notify us immediately if you believe your
              account has been compromised.
            </p>
            <p>
              One subscription per person. We may terminate accounts that abuse
              the trial system or violate these terms.
            </p>
          </Section>

          <Section title="5. Content and intellectual property">
            <p>
              All content we publish remains our intellectual property. You may
              share individual facts or brief excerpts with attribution, but you
              may not reproduce entire issues, resell the content, or create
              competing products based on our output.
            </p>
          </Section>

          <Section title="6. Accuracy and limitation of liability">
            <p>
              We take care to use reliable public sources, but financial data
              changes rapidly and we make no warranty as to the accuracy,
              completeness, or timeliness of our content.
            </p>
            <p>
              To the maximum extent permitted by law, our liability to you for
              any claim arising from your use of this service is limited to the
              amount you paid us in the 12 months preceding the claim.
            </p>
          </Section>

          <Section title="7. Termination">
            <p>
              Either party may end this relationship at any time. You can cancel
              your subscription and stop using the service. We may suspend or
              terminate accounts that violate these terms.
            </p>
          </Section>

          <Section title="8. Contact">
            <p>
              For questions about these terms, contact us at{" "}
              <a
                href="mailto:abeckfriis2002@gmail.com"
                className="text-emerald-400 underline-offset-4 hover:underline"
              >
                abeckfriis2002@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-10 border-t border-white/5 pt-8">
          <Link
            href="/privacy"
            className="text-sm text-emerald-400 underline-offset-4 hover:underline"
          >
            Privacy Policy →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
