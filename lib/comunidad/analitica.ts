import "server-only";

/**
 * Eventos de intención y conversión desde el SERVIDOR, sin datos personales.
 * Nunca se envían correo, nombre, teléfono, tokens, ni ids de usuario/pedido:
 * solo el nombre del evento y propiedades neutras (nivel, intención, origen).
 * Falla en silencio: la analítica jamás debe romper una compra ni un acceso.
 */

export type EventoServidor =
  | "registration_verified"
  | "login_success"
  | "advisor_requested"
  | "checkout_started"
  | "purchase_confirmed";

type Props = Record<string, string | number | boolean>;

export async function registrarEvento(nombre: EventoServidor, props?: Props): Promise<void> {
  try {
    const { track } = await import("@vercel/analytics/server");
    await track(nombre, props);
  } catch {
    /* sin analítica configurada o sin contexto de petición: no pasa nada */
  }
}
