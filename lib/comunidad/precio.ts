/** Moneda de cobro: pesos colombianos (la cohorte 1 es solo Colombia). Stripe la maneja con 2 decimales. */
export const MONEDA = "cop";
export const NOMBRE_PRODUCTO = "Master IA 360";
export const DESCRIPCION_PRODUCTO =
  "Programa en vivo de 4 semanas (8 clases de 2,5 h), entregables y 60 días de comunidad activa.";

/** Pesos → unidad mínima de Stripe (centavos). */
export const pesosACentavos = (pesos: number): number => Math.round(pesos * 100);

/** «$790.000» (el punto como separador de miles, sin depender del ICU del servidor). */
export function formatoPesos(centavos: number): string {
  const pesos = Math.round(centavos / 100);
  return `$${String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Importe legible según la moneda: pesos como «$790.000»; cualquier otra como «USD 297.00». */
export function formatoMoneda(centavos: number, moneda: string): string {
  if (moneda.toLowerCase() === "cop") return formatoPesos(centavos);
  return `${moneda.toUpperCase()} ${(centavos / 100).toFixed(2)}`;
}

/** Fecha y hora en la zona de Colombia, p. ej. «domingo, 18 de octubre de 2026». */
export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long" });
}
