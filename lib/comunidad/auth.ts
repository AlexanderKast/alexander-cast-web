import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase/server";
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
  rol: RolComunidad;
  privacidadAceptada: boolean;
  inscripcion: InscripcionActual | null;
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
  rol: RolComunidad;
  privacidad_aceptada_en: string | null;
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
    .select("nombre, rol, privacidad_aceptada_en")
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
      .select("nombre, rol, privacidad_aceptada_en")
      .single<FilaPerfil>();
    perfil = data;
  }
  if (!perfil) return null;

  const { data: insc } = await supabase
    .from("mia_inscripciones")
    .select("id, entrada, comunidad_vence_en, bonus_clase_privada, cohorte:mia_cohortes(id, nombre, clase1_en)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let inscripcion: InscripcionActual | null = null;
  if (insc) {
    const c = (Array.isArray(insc.cohorte) ? insc.cohorte[0] : insc.cohorte) as
      | { id: string; nombre: string; clase1_en: string | null }
      | null
      | undefined;
    if (c) {
      inscripcion = {
        id: insc.id as string,
        entrada: insc.entrada as Entrada,
        comunidadVenceEn: (insc.comunidad_vence_en as string | null) ?? null,
        bonusClasePrivada: insc.bonus_clase_privada === true,
        cohorte: { id: c.id, nombre: c.nombre, clase1En: c.clase1_en },
      };
    }
  }

  return {
    userId: user.id,
    email: user.email,
    nombre: perfil.nombre,
    rol: perfil.rol,
    privacidadAceptada: perfil.privacidad_aceptada_en !== null,
    inscripcion,
  };
});

export async function requireMiembro(): Promise<Miembro> {
  const m = await getMiembro();
  if (!m) redirect("/comunidad/login");
  return m;
}

/** Miembro que ya aceptó el aviso de privacidad (Ley 1581 de 2012). */
export async function requireMiembroConPrivacidad(): Promise<Miembro> {
  const m = await requireMiembro();
  if (!m.privacidadAceptada) redirect("/comunidad/bienvenida");
  return m;
}

export async function requireAdminComunidad(): Promise<Miembro> {
  const m = await requireMiembro();
  if (m.rol !== "admin") redirect("/comunidad");
  return m;
}
