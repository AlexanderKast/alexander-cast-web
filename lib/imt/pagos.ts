import { z } from "zod";
import { PLAN_IDS, PLANS, type PlanId } from "@/content/imt";

/*
 * IA Master Tech — reglas de cobro y de referidos, sin dependencias de
 * servidor para poder probarlas y usarlas desde el cliente.
 */

export const PERIODOS = ["mensual", "anual"] as const;
export type Periodo = (typeof PERIODOS)[number];

/** Contrato mínimo que se informa al cliente (ver PLAN_CONDITIONS). */
export const MESES_MINIMOS = 3;

/** Plan anual: se pagan 10 meses y se reciben 12. */
export const MESES_PAGADOS_ANUAL = 10;

/** Comisión de referidos sobre el PRIMER pago, en porcentaje. */
export const COMISION_PCT = 10;

/** Días que dura la atribución de un referido (cookie). */
export const VENTANA_REFERIDO_DIAS = 30;

export const COOKIE_REFERIDO = "imt_ref";

export function esPeriodo(valor: unknown): valor is Periodo {
  return typeof valor === "string" && (PERIODOS as readonly string[]).includes(valor);
}

/** Importe que se cobra en el checkout, en COP enteros. */
export function importeCop(plan: PlanId, periodo: Periodo): number {
  const fee = PLANS.find((p) => p.id === plan)?.priceCop;
  if (fee === undefined) throw new Error(`Plan desconocido: ${plan}`);
  return periodo === "anual" ? fee * MESES_PAGADOS_ANUAL : fee;
}

/** Stripe maneja COP con dos decimales: $3.900.000 → 390000000. */
export function aMenorUnidad(cop: number): number {
  return Math.round(cop * 100);
}

export function deMenorUnidad(menor: number): number {
  return Math.round(menor / 100);
}

/** Comisión en COP enteros sobre la base cobrada. */
export function calcularComision(baseCop: number, pct: number = COMISION_PCT): number {
  if (!Number.isFinite(baseCop) || baseCop <= 0) return 0;
  return Math.round((baseCop * pct) / 100);
}

/** Fin del contrato mínimo a partir de la fecha de pago. */
export function minimoHasta(fechaPago: Date, meses: number = MESES_MINIMOS): Date {
  const d = new Date(fechaPago.getTime());
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d;
}

const CODIGO_RE = /^[A-Z0-9]{4,24}$/;

/** Devuelve el código en mayúsculas si tiene la forma válida, o null. */
export function normalizarCodigo(crudo: unknown): string | null {
  if (typeof crudo !== "string") return null;
  const limpio = crudo.trim().toUpperCase();
  return CODIGO_RE.test(limpio) ? limpio : null;
}

const SIN_ACENTOS = /[̀-ͯ]/g;
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Código legible: iniciales del nombre + 4 caracteres sin ambiguos (sin 0/O/1/I/L).
 * `aleatorio` se inyecta para poder probarlo; por defecto usa crypto.
 */
export function generarCodigo(
  nombre: string,
  aleatorio: (max: number) => number = (max) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  },
): string {
  const base = nombre
    .normalize("NFD")
    .replace(SIN_ACENTOS, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 3);
  let sufijo = "";
  for (let i = 0; i < 4; i++) sufijo += ALFABETO[aleatorio(ALFABETO.length)];
  return `${base || "IM"}${sufijo}`;
}

/** Token del panel del referidor: 32 hex, sin guiones. */
export const TOKEN_PANEL_RE = /^[a-f0-9]{32}$/;

export function esTokenPanel(valor: unknown): valor is string {
  return typeof valor === "string" && TOKEN_PANEL_RE.test(valor);
}

export type ContextoComision = {
  referidorId: string | null;
  referidorActivo: boolean;
  emailReferidor: string | null;
  emailComprador: string;
  baseCop: number;
};

export type DecisionComision =
  | { aplica: true; montoCop: number }
  | { aplica: false; motivo: "sin_referidor" | "referidor_inactivo" | "auto_referido" | "base_invalida" };

/** Decide si un primer pago genera comisión, y de cuánto. */
export function decidirComision(ctx: ContextoComision): DecisionComision {
  if (!ctx.referidorId) return { aplica: false, motivo: "sin_referidor" };
  if (!ctx.referidorActivo) return { aplica: false, motivo: "referidor_inactivo" };
  if (ctx.emailReferidor && ctx.emailReferidor.trim().toLowerCase() === ctx.emailComprador.trim().toLowerCase()) {
    return { aplica: false, motivo: "auto_referido" };
  }
  const montoCop = calcularComision(ctx.baseCop);
  if (montoCop <= 0) return { aplica: false, motivo: "base_invalida" };
  return { aplica: true, montoCop };
}

/* ── Formularios ─────────────────────────────────────────────────────── */

const texto = (min: number, max: number, mensaje: string) =>
  z.string().trim().min(min, mensaje).max(max, mensaje);

export const checkoutSchema = z.object({
  plan: z.enum(PLAN_IDS),
  periodo: z.enum(PERIODOS),
  nombre: texto(2, 80, "Escribe tu nombre."),
  empresa: texto(2, 120, "Escribe el nombre de tu empresa."),
  email: z.string().trim().toLowerCase().email("Correo no válido.").max(160, "Correo no válido."),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,19}$/, "WhatsApp no válido."),
  acepta: z.literal(true, { error: "Debes aceptar los términos y la política de privacidad." }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const referidorSchema = z.object({
  nombre: texto(2, 80, "Escribe tu nombre."),
  email: z.string().trim().toLowerCase().email("Correo no válido.").max(160, "Correo no válido."),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,19}$/, "WhatsApp no válido."),
  acepta: z.literal(true, { error: "Debes aceptar las condiciones del programa." }),
});

export type ReferidorInput = z.infer<typeof referidorSchema>;
