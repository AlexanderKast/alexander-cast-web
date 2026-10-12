/**
 * La oferta de Master IA 360 en un solo lugar (fuente: master-ia-360/00-contexto-y-estado-actual.md,
 * decisiones vigentes del 11 de oct de 2026; el precio Regular se actualizó a $1.290.000 el 12 de oct por indicación de Alexander). Cambiar precios, fechas, cupos o textos aquí cambia la
 * página de compra, el cobro y la zona privada, sin tocar componentes. El cliente NUNCA manda el
 * monto: siempre sale de esta tabla.
 */
import { pesosACentavos } from "./precio";

export type Nivel = "preventa" | "regular" | "vip";
export const NIVELES_IDS: Nivel[] = ["preventa", "regular", "vip"];

/** Cupos: 200 en total, el VIP con tope de 10. */
export const CUPOS_TOTAL = 200;
export const CUPOS_VIP = 10;

/** Todas las fechas en hora de Colombia (UTC-5). */
export const FIN_PREVENTA = new Date("2026-10-18T23:59:59-05:00"); // domingo 18, a medianoche
export const CIERRE_INSCRIPCIONES = new Date("2026-10-21T20:00:00-05:00"); // miércoles 21, 8 p. m.

export interface DefNivel {
  id: Nivel;
  nombre: string;
  pesos: number;
  /** Texto corto bajo el precio. */
  nota: string;
  /** Lo exclusivo de este nivel (lo común a todos va en INCLUYE_TODOS). */
  extras: string[];
}

export const NIVELES: Record<Nivel, DefNivel> = {
  preventa: {
    id: "preventa",
    nombre: "Preventa · precio de feria",
    pesos: 790_000,
    nota: "Hasta el domingo 18 de octubre a medianoche. Ahorras $500.000 frente al precio regular.",
    extras: ["Sesión grupal de arranque antes del 22 de octubre"],
  },
  regular: {
    id: "regular",
    nombre: "Regular",
    pesos: 1_290_000,
    nota: "Desde el 19 de octubre. Inscripciones hasta el miércoles 21, 8 p. m.",
    extras: [],
  },
  vip: {
    id: "vip",
    nombre: "VIP",
    pesos: 1_500_000,
    nota: `Para salir con tu negocio armado. Solo ${CUPOS_VIP} cupos.`,
    extras: [
      "Sesión grupal de arranque antes del 22 de octubre",
      "Sesión privada 1:1 de 45 min: la arquitectura de tu negocio",
      "Revisión personal de tu proyecto final",
      "30 días de seguimiento directo por WhatsApp",
    ],
  },
};

/** Lo que incluyen los tres niveles. */
export const INCLUYE_TODOS = [
  "8 clases en vivo de 2,5 h, con grabación en la plataforma",
  "Plantillas, prompts y recursos de cada clase",
  "60 días de comunidad con live semanal de preguntas, repositorios, herramientas y skills",
  "Demo day con los 10 mejores proyectos",
  "Plantilla de tu plan de 90 días",
];

/**
 * Lo que se promete llevarse (lo que ENTREGA Alexander: guía, plantilla, clase), no lo que depende de
 * que cada alumno haga la tarea. Fuente: master-ia-360/00-contexto-y-estado-actual.md.
 */
export const LO_QUE_TE_LLEVAS = [
  "La guía y la plantilla para publicar tu landing",
  "La guía para conectar datos a tu prototipo",
  "Una herramienta interna simple (cotizador o calculadora)",
  "Tu primera tarea automatizada",
  "La plantilla de tu plan de 90 días",
];

/** Se dice en la página de venta, no el día 1. */
export const AVISO_CLAUDE = "Necesitas un plan de pago de Claude activo durante el programa. Ese costo no está incluido.";

export const montoCentavos = (n: Nivel): number => pesosACentavos(NIVELES[n].pesos);

export const esNivel = (v: unknown): v is Nivel => typeof v === "string" && (NIVELES_IDS as string[]).includes(v);

export function inscripcionesAbiertas(ahora: Date = new Date()): boolean {
  return ahora.getTime() <= CIERRE_INSCRIPCIONES.getTime();
}

/** Hasta el 18: Preventa y VIP. Del 19 al 21: Regular y VIP. Después: cerrado. */
export function nivelesDisponibles(ahora: Date = new Date()): Nivel[] {
  if (!inscripcionesAbiertas(ahora)) return [];
  return [ahora.getTime() <= FIN_PREVENTA.getTime() ? "preventa" : "regular", "vip"];
}

export function preventaVigente(ahora: Date = new Date()): boolean {
  return ahora.getTime() <= FIN_PREVENTA.getTime();
}

/**
 * La «clase privada» de la oferta: la sesión grupal de arranque. La reciben
 * quienes entran con Preventa (hasta el 18) y con VIP; el Regular no.
 */
export const incluyeSesionArranque = (n: Nivel): boolean => n === "preventa" || n === "vip";

export const SESION_ARRANQUE = {
  titulo: "Sesión grupal de arranque",
  resumen:
    "Una sesión privada antes de la clase 1 para dejar tu cuenta y tu negocio listos, resolver dudas y arrancar el 22 de octubre con ventaja.",
  /** PENDIENTE (Alexander): fecha entre el 19 y el 21 de octubre. ISO con -05:00. null = «se avisará». */
  fecha: null as string | null,
  /** Enlace a la sesión o a la grabación. */
  enlace: process.env.COMUNIDAD_BONO_URL ?? null,
};

/** «18 de octubre» en español, en hora de Colombia sin depender del locale del servidor. */
export function fechaLimiteLegible(): string {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const col = new Date(FIN_PREVENTA.getTime() - 5 * 3600_000);
  return `${col.getUTCDate()} de ${meses[col.getUTCMonth()]}`;
}
