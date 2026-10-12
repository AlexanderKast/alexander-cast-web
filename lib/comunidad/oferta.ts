/**
 * La oferta de lanzamiento de Master IA 360, en un solo lugar.
 * Cambiar el texto, la fecha o el enlace aquí cambia la página de compra,
 * el correo y la zona privada, sin tocar componentes.
 */

/** Quien CREE su pedido hasta este momento (hora de Colombia) recibe la clase privada. */
export const FECHA_LIMITE_BONO = new Date("2026-10-18T23:59:59-05:00");

export const CLASE_PRIVADA = {
  titulo: "Clase privada: tu primer sistema con IA en una tarde",
  resumen:
    "Una sesión práctica, solo para quienes entran antes del cierre, donde armamos paso a paso el primer flujo de IA de tu negocio.",
  // PENDIENTE (Alexander): confirmar el contenido real de la clase.
  incluye: [
    "Sesión práctica en vivo, con tu caso de negocio",
    "Plantillas y prompts listos para copiar",
    "Grabación disponible en tu cuenta",
  ],
  /** Fecha/hora de la sesión en vivo (ISO). null = «se anunciará por correo». */
  fecha: null as string | null,
  /** Enlace a la sesión o a la grabación (Bunny/Zoom/YouTube privado). */
  enlace: process.env.COMUNIDAD_BONO_URL ?? null,
};

export function bonoVigente(ahora: Date = new Date()): boolean {
  return ahora.getTime() <= FECHA_LIMITE_BONO.getTime();
}

/** «18 de octubre» en español, sin depender del locale del servidor. */
export function fechaLimiteLegible(): string {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  // Se lee en hora de Colombia (UTC-5) para que no cambie el día según el servidor.
  const col = new Date(FECHA_LIMITE_BONO.getTime() - 5 * 3600_000);
  return `${col.getUTCDate()} de ${meses[col.getUTCMonth()]}`;
}
