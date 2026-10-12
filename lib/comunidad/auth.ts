import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase/server";
import { destinoPorEstado, inscripcionVigente, type DestinoAcceso } from "./acceso";
import type { Entrada } from "./validators";

export type RolComunidad = "alumno" | "moderador" | "admin";

export interface InscripcionActual {
  id: string;
  entrada: Entrada;
  comunidadVenceEn: string | null;
  bonusClasePrivada: boolean;
  cohorte: { id: string; nombre: string; clase1En: string | null };
}

export interface Miembro {
  userId: string;
  email: string;
  nombre: string;
  whatsapp: string | null;
  rol: RolComunidad;
  privacidadAceptada: boolean;
  /**
   * La inscripción VIGENTE (activa y sin vencer), o null. Tener perfil NO
   * implica tener inscripción: sin ella no hay acceso a nada pagado.
   */
  inscripcion: InscripcionActual | null;
  /** Hubo inscripciones pero ninguna sigue vigente (revocada o vencida). */
  inscripcionNoVigente: boolean;
}

/**
 * Correos que entran como admin la primera vez que inician sesión, sin
 * depender de una fila previa en mia_perfiles. Evita el problema del huevo
 * y la gallina al arrancar. Variable: COMUNIDAD_ADMIN_EMAILS (separada por comas).
 */
function esAdminSemilla(email: string): boolean {
  return (process.env.COMUNIDAD_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

interface FilaPerfil {
  nombre: string;
  whatsapp: string | null;
  rol: RolComunidad;
  privacidad_aceptada_en: string | null;
}

const COLS_INSCRIPCION =
  "id, entrada, estado, comunidad_vence_en, bonus_clase_privada, created_at, cohorte:mia_cohortes(id, nombre, clase1_en)";

interface FilaInscripcion {
  id: string;
  entrada: Entrada;
  estado: string;
  comunidad_vence_en: string | null;
  bonus_clase_privada: boolean | null;
  cohorte: { id: string; nombre: string; clase1_en: string | null } | { id: string; nombre: string; clase1_en: string | null }[] | null;
}

/** Elige, entre todas las inscripciones, la más reciente que SIGUE vigente. */
function elegirVigente(filas: FilaInscripcion[]): { vigente: InscripcionActual | null; hubo: boolean } {
  for (const f of filas) {
    if (!inscripcionVigente({ estado: f.estado, comunidadVenceEn: f.comunidad_vence_en })) continue;
    const c = Array.isArray(f.cohorte) ? f.cohorte[0] : f.cohorte;
    if (!c) continue;
    return {
      hubo: true,
      vigente: {
        id: f.id,
        entrada: f.entrada,
        comunidadVenceEn: f.comunidad_vence_en,
        bonusClasePrivada: f.bonus_clase_privada === true,
        cohorte: { id: c.id, nombre: c.nombre, clase1En: c.clase1_en },
      },
    };
  }
  return { vigente: null, hubo: filas.length > 0 };
}

/** Miembro de la comunidad con sesión, o null. Un usuario de auth sin perfil NO es miembro. */
export const getMiembro = cache(async (): Promise<Miembro | null> => {
  // Sin configuración de Supabase (clon nuevo, preview sin variables) las
  // páginas públicas siguen renderizando en vez de caerse con un 500.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[comunidad] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    return null;
  }
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  let { data: perfil } = await supabase
    .from("mia_perfiles")
    .select("nombre, whatsapp, rol, privacidad_aceptada_en")
    .eq("user_id", user.id)
    .maybeSingle<FilaPerfil>();

  if (!perfil && esAdminSemilla(user.email)) {
    const admin = createSupabaseServiceRole();
    const { data } = await admin
      .from("mia_perfiles")
      .upsert(
        {
          user_id: user.id,
          email: user.email.toLowerCase(),
          nombre: user.email.split("@")[0],
          rol: "admin",
        },
        { onConflict: "user_id" },
      )
      .select("nombre, whatsapp, rol, privacidad_aceptada_en")
      .single<FilaPerfil>();
    perfil = data;
  }
  if (!perfil) return null;

  // Todas las inscripciones (no solo la más antigua): vale la más reciente que siga vigente.
  const { data: filas } = await supabase
    .from("mia_inscripciones")
    .select(COLS_INSCRIPCION)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const { vigente, hubo } = elegirVigente((filas ?? []) as unknown as FilaInscripcion[]);

  return {
    userId: user.id,
    email: user.email,
    nombre: perfil.nombre,
    whatsapp: perfil.whatsapp,
    rol: perfil.rol,
    privacidadAceptada: perfil.privacidad_aceptada_en !== null,
    inscripcion: vigente,
    inscripcionNoVigente: hubo && vigente === null,
  };
});

/** Adónde debe ir un miembro ya cargado, según el contrato central de acceso. */
export function destinoDeMiembro(m: Miembro | null): DestinoAcceso {
  return destinoPorEstado({
    conSesion: m !== null,
    tienePerfil: m !== null,
    inscripcionVigente: m?.inscripcion != null,
    privacidadAceptada: m?.privacidadAceptada ?? false,
  });
}

/**
 * Destino de un usuario YA verificado, calculado con service role a partir de
 * su id (para el canje del enlace, donde las cookies de la nueva sesión
 * todavía no se leen en la misma petición). Solo usar con un id que acaba de
 * salir de verifyOtp.
 */
export async function destinoDeUsuario(userId: string): Promise<DestinoAcceso> {
  const admin = createSupabaseServiceRole();
  const { data: perfil } = await admin
    .from("mia_perfiles")
    .select("privacidad_aceptada_en")
    .eq("user_id", userId)
    .maybeSingle();
  if (!perfil) return "/comunidad/login";

  const { data: filas } = await admin
    .from("mia_inscripciones")
    .select(COLS_INSCRIPCION)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const { vigente } = elegirVigente((filas ?? []) as unknown as FilaInscripcion[]);

  return destinoPorEstado({
    conSesion: true,
    tienePerfil: true,
    inscripcionVigente: vigente !== null,
    privacidadAceptada: perfil.privacidad_aceptada_en !== null,
  });
}

/** Cualquier miembro (con perfil), tenga o no inscripción. Para «mi cuenta». */
export async function requireMiembro(): Promise<Miembro> {
  const m = await getMiembro();
  if (!m) redirect("/comunidad/login");
  return m;
}

/**
 * Miembro con inscripción VIGENTE. Guard de todo lo pagado: sin inscripción
 * (nunca compró, revocada o vencida) va a «mi cuenta». El perfil solo no basta.
 */
export async function requireInscripcion(): Promise<Miembro & { inscripcion: InscripcionActual }> {
  const m = await requireMiembro();
  if (!m.inscripcion) redirect("/comunidad/mi-cuenta");
  return m as Miembro & { inscripcion: InscripcionActual };
}

/** Inscripción vigente y aviso de privacidad aceptado (Ley 1581 de 2012). */
export async function requireMiembroConPrivacidad(): Promise<Miembro & { inscripcion: InscripcionActual }> {
  const m = await requireInscripcion();
  if (!m.privacidadAceptada) redirect("/comunidad/bienvenida");
  return m;
}

export async function requireAdminComunidad(): Promise<Miembro> {
  const m = await requireMiembro();
  if (m.rol !== "admin") redirect("/comunidad");
  return m;
}
