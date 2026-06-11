import Stripe from "stripe";

import { env } from "./env";

let client: Stripe | null = null;

/** Server-only Stripe client (lazy singleton). */
export function stripe(): Stripe {
  if (!client) {
    client = new Stripe(env.stripeSecretKey());
  }
  return client;
}

const PRICE_LOOKUP_KEY = "wfb_monthly_core";

/**
 * Idempotently ensures the monthly subscription price exists and returns its id.
 * Self-bootstrapping: no dashboard clicking needed. Found via stable lookup_key,
 * created on first ever checkout ($5.00/mo USD — adjust in Stripe later if needed;
 * lookup_key keeps code stable across price changes).
 */
export async function ensureMonthlyPriceId(): Promise<string> {
  const s = stripe();
  const existing = await s.prices.list({
    lookup_keys: [PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) {
    return existing.data[0].id;
  }
  const product = await s.products.create({
    name: "Weekly Finance Brief",
    description:
      "A concise weekly macro & markets brief: what happened, why it matters, what to watch next.",
  });
  const price = await s.prices.create({
    product: product.id,
    unit_amount: 500, // €5.00 (EUR is 2-decimal). France account default currency.
    currency: "eur",
    recurring: { interval: "month" },
    lookup_key: PRICE_LOOKUP_KEY,
  });
  return price.id;
}
