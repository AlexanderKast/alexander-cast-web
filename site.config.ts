/**
 * IA Master Tech — values that change without touching components.
 */

/**
 * Founder slots available this quarter. `null` hides the number and shows
 * "Cupos limitados este trimestre" instead.
 * TODO(alex): set the real number, e.g. `3`.
 */
export const N_CUPOS: number | null = null;

/**
 * WhatsApp number in international format, digits only (current site number).
 * Server-only on purpose: it is handed out after a registration, never in
 * public pages or client bundles.
 */
export const WHATSAPP_NUMBER = "573132947776";

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

