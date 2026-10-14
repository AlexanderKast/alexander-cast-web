/**
 * Contrato de acceso de la plataforma (lógica pura, sin IO).
 *
 * Cuatro cosas distintas: persona interesada (lead / oportunidad), identidad (cuenta de Supabase Auth,
 * compartida con admin y portal), perfil de la plataforma y DERECHO de acceso a un programa.
 *
 * - Tener cuenta y perfil basta para entrar al panel, al catálogo y a «Mi cuenta» (aunque no haya comprado).
 * - Cada contenido pagado exige un derecho vigente sobre SU programa (ver ofertas.ts / auth.ts).
 * - No hay un guard de pago global: eso mandaba a las cuentas sin compras a la landing en bucle.
 */

export type DestinoAcceso = "/comunidad/login" | "/comunidad/bienvenida" | "/comunidad";

export interface EstadoAcceso {
  /** Hay sesión de Supabase. */
  conSesion: boolean;
  /** La sesión tiene perfil en mia_perfiles (un usuario global del portal/admin no lo tiene). */
  tienePerfil: boolean;
  privacidadAceptada: boolean;
}

/** Un solo lugar decide adónde va cada persona: evita bucles entre guards. */
export function destinoPorEstado(e: EstadoAcceso): DestinoAcceso {
  if (!e.conSesion || !e.tienePerfil) return "/comunidad/login";
  if (!e.privacidadAceptada) return "/comunidad/bienvenida";
  return "/comunidad";
}

export interface InscripcionLite {
  estado: string;
  comunidadVenceEn: string | null;
}

/**
 * Política: el derecho vale si está 'activa' y no venció. Un reembolso total o una disputa lo dejan
 * 'revocada'. Una fila no concede acceso eterno.
 */
export function inscripcionVigente(i: InscripcionLite | null | undefined, ahora: Date = new Date()): boolean {
  if (!i || i.estado !== "activa") return false;
  if (i.comunidadVenceEn === null) return true;
  const vence = new Date(i.comunidadVenceEn).getTime();
  return Number.isFinite(vence) && vence > ahora.getTime();
}

/* ───────────── Destinos internos permitidos (`next`) ───────────── */

const RUTAS_ESTATICAS = [
  "/comunidad",
  "/comunidad/mi-cuenta",
  "/comunidad/programas",
  "/comunidad/mis-programas",
  "/comunidad/ficha",
  "/comunidad/bono",
  "/comunidad/unete",
] as const;

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const slugValido = (v: unknown): v is string => typeof v === "string" && v.length <= 60 && SLUG.test(v);
export const uuidValido = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/**
 * Devuelve la ruta SOLO si es una de las permitidas; si no, null. Sin URLs externas, sin protocolo
 * relativo, sin rutas de admin, sin query. Las páginas de destino aplican igualmente sus propios
 * guards: esto solo evita open redirects, no concede acceso.
 */
export function rutaInternaPermitida(next: unknown): string | null {
  if (typeof next !== "string" || next.length > 120) return null;
  if ((RUTAS_ESTATICAS as readonly string[]).includes(next)) return next;

  const programa = /^\/comunidad\/programas\/([^/]+)$/.exec(next);
  if (programa && slugValido(programa[1])) return next;

  const pedido = /^\/comunidad\/pedidos\/([^/]+)$/.exec(next);
  if (pedido && uuidValido(pedido[1])) return next.toLowerCase();

  return null;
}

/** Detalle interno del programa de interés; sin intención válida, el catálogo. */
export function rutaDeInteres(productoSlug: unknown): string {
  return slugValido(productoSlug) ? `/comunidad/programas/${productoSlug}` : "/comunidad/programas";
}
