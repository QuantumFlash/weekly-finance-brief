import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy Policy — Weekly Finance Brief",
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

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 font-sans text-zinc-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <header className="mb-10 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-zinc-500">Last updated: June 2026</p>
        </header>

        <div className="flex flex-col gap-8">
          <Section title="1. What we collect">
            <p>
              <strong className="text-zinc-200">Email address.</strong> Required
              to deliver your brief and manage your account. We never sell or
              rent your email address.
            </p>
            <p>
              <strong className="text-zinc-200">Delivery preference.</strong>{" "}
              The day of the week you've chosen to receive your brief.
            </p>
            <p>
              <strong className="text-zinc-200">Payment information.</strong>{" "}
              Handled entirely by Stripe. We do not store your card number or
              banking details — only the Stripe customer ID, subscription status,
              and billing period dates.
            </p>
            <p>
              <strong className="text-zinc-200">Email send records.</strong> We
              log whether each issue was successfully delivered to you, for
              operational purposes.
            </p>
          </Section>

          <Section title="2. How we use your data">
            <p>
              We use your data to: deliver your weekly brief on your chosen day;
              process subscription payments; send you transactional emails
              (welcome, sign-in links); provide you with account access and
              billing management.
            </p>
            <p>
              We do not use your data for advertising, tracking, or profiling.
            </p>
          </Section>

          <Section title="3. Third-party services">
            <p>
              We share data with the following services, each with their own
              privacy policies:
            </p>
            <ul className="list-disc pl-5">
              <li>
                <strong className="text-zinc-200">Supabase</strong> — database
                and authentication
              </li>
              <li>
                <strong className="text-zinc-200">Stripe</strong> — payment
                processing
              </li>
              <li>
                <strong className="text-zinc-200">Resend</strong> — email
                delivery
              </li>
              <li>
                <strong className="text-zinc-200">Google AI Studio</strong> —
                content generation (brief text; no personal data is included in
                generation prompts)
              </li>
            </ul>
          </Section>

          <Section title="4. Data retention">
            <p>
              We retain your account data for as long as your subscription is
              active and for a reasonable period afterwards in case of billing
              disputes. You may request deletion of your account at any time.
            </p>
            <p>
              Delivered email records (which issues you received) are retained
              for 12 months for operational purposes.
            </p>
          </Section>

          <Section title="5. Your rights">
            <p>
              Depending on your jurisdiction, you may have the right to access,
              correct, or delete your personal data; to object to processing; and
              to data portability.
            </p>
            <p>
              To exercise any of these rights, or to request account deletion,
              contact us at{" "}
              <a
                href="mailto:abeckfriis2002@gmail.com"
                className="text-emerald-400 underline-offset-4 hover:underline"
              >
                abeckfriis2002@gmail.com
              </a>
              . We will respond within 30 days.
            </p>
          </Section>

          <Section title="6. Cookies">
            <p>
              We use only session cookies necessary for authentication. We do not
              use advertising cookies or third-party tracking.
            </p>
          </Section>

          <Section title="7. Changes to this policy">
            <p>
              We may update this policy. Material changes will be communicated
              by email at least 14 days before they take effect.
            </p>
          </Section>
        </div>

        <div className="mt-10 border-t border-white/5 pt-8">
          <Link
            href="/terms"
            className="text-sm text-emerald-400 underline-offset-4 hover:underline"
          >
            Terms of Service →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
