/**
 * Contrato de acceso del módulo (lógica pura, sin IO).
 *
 * Cuatro cosas distintas: persona interesada (lead), identidad (cuenta de
 * Supabase Auth, compartida con admin y portal), perfil del módulo y
 * inscripción pagada. Tener cuenta o perfil NO da acceso al programa: solo
 * una inscripción vigente.
 */

export type DestinoAcceso =
  | "/comunidad/login"
  | "/comunidad/mi-cuenta"
  | "/comunidad/bienvenida"
  | "/comunidad";

export interface EstadoAcceso {
  /** Hay sesión de Supabase. */
  conSesion: boolean;
  /** La sesión tiene perfil en mia_perfiles (un usuario global del portal/admin no lo tiene). */
  tienePerfil: boolean;
  inscripcionVigente: boolean;
  privacidadAceptada: boolean;
}

/** Un solo lugar decide adónde va cada persona: evita bucles entre guards. */
export function destinoPorEstado(e: EstadoAcceso): DestinoAcceso {
  if (!e.conSesion || !e.tienePerfil) return "/comunidad/login";
  if (!e.inscripcionVigente) return "/comunidad/mi-cuenta";
  if (!e.privacidadAceptada) return "/comunidad/bienvenida";
  return "/comunidad";
}

export interface InscripcionLite {
  estado: string;
  comunidadVenceEn: string | null;
}

/**
 * Política: la inscripción vale si está 'activa' y no venció. Un reembolso
 * total o una disputa la dejan 'revocada'. Una fila no concede acceso eterno.
 */
export function inscripcionVigente(i: InscripcionLite | null | undefined, ahora: Date = new Date()): boolean {
  if (!i || i.estado !== "activa") return false;
  if (i.comunidadVenceEn === null) return true;
  const vence = new Date(i.comunidadVenceEn).getTime();
  return Number.isFinite(vence) && vence > ahora.getTime();
}

/** Destinos internos que se pueden pedir con `next`. Lista cerrada: nada de URLs libres. */
export const RUTAS_NEXT_PERMITIDAS = [
  "/comunidad",
  "/comunidad/ficha",
  "/comunidad/bono",
  "/comunidad/mi-cuenta",
  "/comunidad/unete",
] as const;

/** Devuelve la ruta solo si coincide EXACTAMENTE con la lista; si no, null (sin open redirect). */
export function rutaInternaPermitida(next: unknown): string | null {
  if (typeof next !== "string") return null;
  return (RUTAS_NEXT_PERMITIDAS as readonly string[]).includes(next) ? next : null;
}
