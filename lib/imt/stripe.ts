import "server-only";
import Stripe from "stripe";

/*
 * Stripe de IA Master Tech. Acepta una cuenta propia (IMT_STRIPE_*) y, si no
 * está definida, cae a la de Master IA 360 (STRIPE_*). El webhook SIEMPRE usa
 * su propio secreto: cada endpoint de Stripe tiene el suyo.
 */

let cliente: Stripe | null = null;

function llave(): string | undefined {
  return process.env.IMT_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || undefined;
}

export function imtStripeConfigurado(): boolean {
  return Boolean(llave());
}

export function getImtStripe(): Stripe {
  const key = llave();
  if (!key) throw new Error("Falta IMT_STRIPE_SECRET_KEY (o STRIPE_SECRET_KEY)");
  cliente ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
  return cliente;
}

export function imtWebhookSecret(): string | undefined {
  return process.env.IMT_STRIPE_WEBHOOK_SECRET || undefined;
}
