/** Precio único de Master IA 360. Cambiarlo aquí cambia el cobro y lo que ve el comprador. */
export const PRECIO_CENTAVOS = 29_700; // US$297.00
export const MONEDA = "usd";
export const NOMBRE_PRODUCTO = "Master IA 360";
export const DESCRIPCION_PRODUCTO =
  "Programa en vivo de 4 semanas (8 clases), entregables y 60 días de comunidad activa.";

export function formatoPrecio(centavos: number = PRECIO_CENTAVOS): string {
  return `US$${(centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
