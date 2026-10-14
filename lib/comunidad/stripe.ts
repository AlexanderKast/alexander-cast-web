import "server-only";
import Stripe from "stripe";

let cliente: Stripe | null = null;

export function stripeConfigurado(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
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
