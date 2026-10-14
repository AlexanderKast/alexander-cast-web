import "server-only";
import Stripe from "stripe";

let cliente: Stripe | null = null;

/**
 * Clave secreta de Stripe. Se acepta STRIPE_SECRET_KEY o, si no existe, IMT_STRIPE_SECRET_KEY: comunidad y los planes de
 * IA Master Tech cobran en la MISMA cuenta de Stripe, así que comparten clave y no hay que duplicarla en Vercel.
 */
export function claveStripe(): string | undefined {
  return process.env.STRIPE_SECRET_KEY || process.env.IMT_STRIPE_SECRET_KEY || undefined;
}

/**
 * Secreto de firma del webhook de comunidad. NO se comparte con IMT_STRIPE_WEBHOOK_SECRET: cada endpoint de Stripe tiene
 * su propio secreto (el de /api/comunidad/stripe es distinto del de /api/imt/stripe).
 */
export function secretoWebhookStripe(): string | undefined {
  return process.env.COMUNIDAD_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || undefined;
}

export function stripeConfigurado(): boolean {
  return Boolean(claveStripe());
}

export function getStripe(): Stripe {
  const key = claveStripe();
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY (o IMT_STRIPE_SECRET_KEY)");
  cliente ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
  return cliente;
}

/**
 * El simulador de pago solo existe en desarrollo y solo si Stripe NO está
 * configurado: en cuanto hay STRIPE_SECRET_KEY se apaga solo.
 */
export function simuladorActivo(): boolean {
  return process.env.NODE_ENV !== "production" && !stripeConfigurado();
}
