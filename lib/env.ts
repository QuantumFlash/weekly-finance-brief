/**
 * Typed, lazy environment access.
 *
 * Lazy getters so missing M3 keys (e.g. ANTHROPIC_API_KEY) don't crash M1 code paths —
 * each key fails loudly only at the moment something actually needs it.
 * Server-only secrets must never be imported from client components.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. See .env.example and fill .env.local.`,
    );
  }
  return value;
}

export const env = {
  // Data sources
  fredApiKey: () => required("FRED_API_KEY"),
  alphaVantageApiKey: () => required("ALPHAVANTAGE_API_KEY"),

  // Email
  resendApiKey: () => required("RESEND_API_KEY"),
  emailFrom: () => process.env.EMAIL_FROM ?? "onboarding@resend.dev",

  // Stripe (server only)
  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  stripePublishableKey: () => required("STRIPE_PUBLISHABLE_KEY"),

  // Supabase
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseAnonKey: () => required("SUPABASE_ANON_KEY"),
  /** service_role — SERVER ONLY. */
  supabaseServiceKey: () => required("SUPABASE_SERVICE_KEY"),

  // Anthropic
  anthropicApiKey: () => required("ANTHROPIC_API_KEY"),

  // Ops
  cronSecret: () => required("CRON_SECRET"),
} as const;
