/**
 * Interruptor de la entrada directa de prueba. Vive fuera de los archivos
 * "use server" (ahí solo se pueden exportar funciones async).
 * Solo en desarrollo Y con COMUNIDAD_DEV_LOGIN=true; nunca en producción.
 */
export function entradaDirectaActiva(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.COMUNIDAD_DEV_LOGIN === "true";
}
