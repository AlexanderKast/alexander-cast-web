/**
 * IA Master Tech — landing copy and data. Components render from here so the
 * copy lives in one place and the JSON-LD matches what users see.
 */

export const NAV_ITEMS = [
  { label: "Inicio", href: "/" },
  { label: "Cómo trabajamos", href: "/como-trabajamos" },
  { label: "Planes", href: "/planes" },
  { label: "Equipo", href: "/nosotros" },
] as const;

export const CATEGORIES = [
  "Automatizaciones",
  "Integraciones",
  "Dashboards en tiempo real",
  "Software a la medida",
  "Agentes de IA",
] as const;

export type ProblemIcon = "clock" | "scattered" | "person" | "quote";

export const PROBLEMS: { icon: ProblemIcon; text: string }[] = [
  { icon: "clock", text: "Horas perdidas cada día en tareas repetitivas." },
  { icon: "scattered", text: "Información regada entre Excel, WhatsApp y la memoria de alguien." },
  { icon: "person", text: "Procesos clave que dependen de una sola persona." },
  { icon: "quote", text: "Cotizaciones de software de meses y decenas de millones." },
];

export type StepIcon = "diagnose" | "build" | "operate";

export const STEPS: { icon: StepIcon; title: string; text: string; image: string; alt: string }[] = [
  {
    icon: "diagnose",
    image: "/images/imt/diagnosticamos.webp",
    alt: "Lupa de luz analizando un diagrama de procesos con un cuello de botella resaltado",
    title: "Diagnosticamos",
    text: "Mapeamos tus procesos y cuellos de botella, y priorizamos por impacto.",
  },
  {
    icon: "build",
    image: "/images/imt/construimos.webp",
    alt: "Brazo robótico ensamblando módulos de software conectados por líneas de datos",
    title: "Construimos",
    text: "Automatizaciones, integraciones y software a la medida, con un sprint semanal que ves funcionando.",
  },
  {
    icon: "operate",
    image: "/images/imt/operamos.webp",
    alt: "Tablero de monitoreo con gráficas en vivo sobre engranajes en movimiento",
    title: "Operamos",
    text: "Monitoreamos, mantenemos y mejoramos lo construido. Nada se abandona.",
  },
];

export type ResultIcon = "hours" | "errors" | "realtime" | "connected" | "scale" | "ownership";

export const RESULTS: { icon: ResultIcon; title: string; text: string }[] = [
  {
    icon: "hours",
    title: "Horas recuperadas",
    text: "Lo repetitivo lo hace el sistema. Tu equipo vuelve a lo que genera ventas.",
  },
  {
    icon: "errors",
    title: "Cero errores de digitación",
    text: "Los datos pasan de una herramienta a otra sin que nadie los copie a mano.",
  },
  {
    icon: "realtime",
    title: "Datos en tiempo real",
    text: "Ves cómo va el negocio hoy, no cuando alguien termina el reporte.",
  },
  {
    icon: "connected",
    title: "Herramientas conectadas",
    text: "Tienda, facturación, CRM y hojas de cálculo hablando entre sí.",
  },
  {
    icon: "scale",
    title: "Escalabilidad sin duplicar nómina",
    text: "Atiendes más pedidos y clientes con el mismo equipo.",
  },
  {
    icon: "ownership",
    title: "Activos propios",
    text: "Todo queda a tu nombre: código, automatizaciones, accesos y documentación.",
  },
];

export const TEAM = [
  {
    slug: "alexander",
    name: "Alexander Castaño",
    role: "Estrategia e IA aplicada",
    initials: "AC",
    photo: "/team/alexander.jpg",
    bio: [
      "8 años construyendo negocios digitales en LATAM.",
      "Implementó IA en Grupo Effi y Feria Effix.",
      "Traduce el problema del negocio en el sistema correcto.",
    ],
  },
  {
    slug: "samuel",
    name: "Samuel Castaño",
    role: "Desarrollo y automatización",
    initials: "SC",
    photo: "/team/samuel.jpg",
    bio: ["Construye, integra y mantiene cada sistema en producción."],
  },
] as const;

export type PlanId = "automatiza" | "acelera" | "escala";

export type Plan = {
  id: PlanId;
  name: string;
  /** Monthly fee in COP. Always shown with "desde". */
  priceCop: number;
  hours: string;
  projects: string;
  description: string;
  featured: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "automatiza",
    name: "AUTOMATIZA",
    priceCop: 3_900_000,
    hours: "10 horas semanales",
    projects: "1 proyecto a la vez",
    description: "Para automatizar procesos clave con un frente enfocado.",
    featured: false,
  },
  {
    id: "acelera",
    name: "ACELERA",
    priceCop: 6_900_000,
    hours: "20 horas semanales",
    projects: "2 proyectos en paralelo",
    description: "Para desarrollar a la medida mientras se automatiza la operación.",
    featured: true,
  },
  {
    id: "escala",
    name: "ESCALA",
    priceCop: 9_600_000,
    hours: "30 horas semanales",
    projects: "hasta 4 proyectos en paralelo",
    description: "Para operaciones con producto propio y varios frentes en construcción.",
    featured: false,
  },
];

export const PLAN_IDS = PLANS.map((p) => p.id) as [PlanId, ...PlanId[]];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}

export function planName(id: PlanId): string {
  return PLANS.find((p) => p.id === id)?.name ?? id;
}

/** "$3.900.000" — Colombian thousands separator, no decimals. */
export function formatCop(value: number): string {
  return `$${value.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

export const PLAN_INCLUDES = [
  "Diagnóstico y roadmap inicial",
  "1 sprint semanal con entrega en producción",
  "Tablero compartido y canal directo",
  "Soporte sobre lo construido",
  "Código, accesos y documentación a tu nombre",
  "1 reunión mensual de seguimiento",
  "1 informe mensual de horas y resultados",
] as const;

export const PLAN_CONDITIONS = [
  "Contrato mínimo de 3 meses",
  "Plan anual: pagas 10 meses y recibes 12",
  "Las herramientas de terceros (APIs, plataformas, servidores, licencias) las asume el cliente y quedan a su nombre",
  "Clientes fuera de Colombia: cotización en USD",
] as const;

export const FAQS = [
  {
    question: "¿De quién es el código?",
    answer: "Tuyo. Código, automatizaciones, accesos y documentación quedan a nombre de tu empresa.",
  },
  {
    question: "¿Qué pasa si cancelo después de los 3 meses?",
    answer: "Te quedas con todo lo construido y documentado.",
  },
  {
    question: "¿Qué no incluye el fee?",
    answer: "Los costos de herramientas de terceros: APIs, servidores, plataformas y licencias.",
  },
  {
    question: "¿Cuánto tarda en verse algo funcionando?",
    answer: "La primera entrega llega en el primer sprint semanal, después del diagnóstico.",
  },
  {
    question: "¿Trabajan fuera de Medellín?",
    answer: "Sí, todo es remoto. Trabajamos con empresas en Colombia y LATAM.",
  },
] as const;

/** Tools we integrate with (text chips, no third-party logos). */
export const TOOLS = [
  "Shopify",
  "Siigo",
  "HubSpot",
  "WhatsApp Business",
  "Google Sheets",
  "Excel",
  "Meta Ads",
  "Gmail",
  "Google Drive",
  "APIs a la medida",
] as const;

/** Before / after comparison (qualitative, no invented numbers). */
export const BEFORE_AFTER = [
  { operar: "Cotizaciones armadas a mano en Excel", escalar: "Cotizaciones generadas solas desde tus datos" },
  { operar: "Pedidos copiados de WhatsApp a una hoja", escalar: "Pedidos que entran directo al sistema" },
  { operar: "El reporte llega cuando alguien lo termina", escalar: "Tablero con las cifras del día, en tiempo real" },
  { operar: "Si una persona falta, el proceso se frena", escalar: "El proceso corre sin depender de nadie" },
] as const;

/** First month timeline, built from what every plan includes. */
export const FIRST_MONTH = [
  { week: "Semana 1", title: "Diagnóstico y roadmap", text: "Mapeamos tus procesos, encontramos los cuellos de botella y priorizamos por impacto." },
  { week: "Semana 2", title: "Primer sprint en producción", text: "La primera entrega funcionando: la ves, la usas y nos das feedback." },
  { week: "Semana 3", title: "Siguiente sprint", text: "Construimos sobre lo que ya funciona. Tablero compartido y canal directo." },
  { week: "Semana 4", title: "Informe y seguimiento", text: "Informe mensual de horas y resultados, y reunión para decidir lo que sigue." },
] as const;

/** Registration (diagnostic form) link; plan preselected when given. */
export function diagnosticoHref(planId?: PlanId): string {
  return planId ? `/diagnostico?plan=${planId}` : "/diagnostico";
}
