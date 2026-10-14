/**
 * Contenido editorial de Master IA 360 (texto de la landing y de su ficha).
 *
 * IMPORTANTE: aquí NO viven precios, fechas de venta, cupos ni derechos. Eso sale de la base
 * (mia_productos / mia_ofertas), que es lo que también usa el cobro: así la página y el cobro no pueden
 * discrepar. Este archivo solo guarda lo que no depende de la oferta vigente.
 *
 * Fuente: master-ia-360/00-contexto-y-estado-actual.md.
 */

export const PRODUCTO_PRINCIPAL = "master-ia-360";

/** Lo que incluyen todas las entradas. */
export const INCLUYE_TODOS = [
  "8 clases en vivo de 2,5 h, con grabación en la plataforma",
  "Plantillas, prompts y recursos de cada clase",
  "60 días de comunidad con live semanal de preguntas, repositorios, herramientas y skills",
  "Demo day con los 10 mejores proyectos",
  "Plantilla de tu plan de 90 días",
];

/**
 * Lo que se promete llevarse (lo que ENTREGA Alexander: guía, plantilla, clase), no lo que depende de
 * que cada alumno haga la tarea.
 */
export const LO_QUE_TE_LLEVAS = [
  "La guía y la plantilla para publicar tu landing",
  "La guía para conectar datos a tu prototipo",
  "Una herramienta interna simple (cotizador o calculadora)",
  "Tu primera tarea automatizada",
  "La plantilla de tu plan de 90 días",
];

export const RESULTADOS = [
  ["Una web", "Construyes y publicas tu landing con las plantillas y la guía del programa."],
  ["Una app", "Diseñas el prototipo de tu app y aprendes a conectarle datos."],
  ["Una herramienta", "Armas una herramienta interna simple y tu primera tarea automatizada."],
] as const;

/** Se dice en la página de venta, no el día 1. */
export const AVISO_CLAUDE = "Necesitas un plan de pago de Claude activo durante el programa. Ese costo no está incluido.";

/** Nombres legibles de los derechos que una oferta puede otorgar. */
export const ETIQUETA_DERECHO: Record<string, string> = {
  sesion_arranque: "Sesión grupal de arranque",
  sesion_1a1: "Sesión privada 1:1 de 45 min",
  revision_proyecto: "Revisión personal de tu proyecto final",
  seguimiento_30d: "30 días de seguimiento directo por WhatsApp",
};

/**
 * La sesión grupal de arranque: la reciben las ofertas que otorgan el derecho `sesion_arranque`.
 * La sesión 1:1 es exclusiva de quien tenga el derecho `sesion_1a1`.
 */
export const SESION_ARRANQUE = {
  titulo: "Sesión grupal de arranque",
  resumen:
    "Una sesión antes de la clase 1 para dejar tu cuenta y tu negocio listos, resolver dudas y arrancar el 22 de octubre con ventaja.",
  /** PENDIENTE (Alexander): fecha entre el 19 y el 21 de octubre. ISO con -05:00. null = «se avisará». */
  fecha: null as string | null,
  /** Enlace a la sesión o a la grabación. */
  enlace: process.env.COMUNIDAD_BONO_URL ?? null,
};

export const FAQ_MASTER = [
  ["¿Cuándo empiezan las clases?", "El jueves 22 de octubre. Son 8 clases de 2,5 horas, 2 por semana, 100% virtuales."],
  ["¿Cómo accedo a los contenidos?", "Creas tu cuenta gratis, eliges tu entrada dentro de la plataforma y, cuando se confirma tu pago, el programa aparece en «Mis programas»."],
  ["¿Crear la cuenta me compromete a algo?", "No. Crear una cuenta es gratis y no es una compra ni reserva un cupo."],
  ["¿Qué pasa si no termino el pago?", "Puedes retomar la compra mientras haya cupos y la oferta siga vigente."],
  ["¿Qué necesito aparte?", AVISO_CLAUDE],
] as const;
