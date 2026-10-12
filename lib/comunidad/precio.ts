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
