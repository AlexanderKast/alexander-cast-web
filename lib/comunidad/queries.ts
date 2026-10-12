import { createSupabaseServiceRole } from "@/lib/supabase/server";
import type { Entrada } from "./validators";

/** Lecturas del panel de admin. Usan service role: llamarlas solo tras requireAdminComunidad(). */

export interface Cohorte {
  id: string;
  nombre: string;
  clase1En: string | null;
  activa: boolean;
}

export async function listarCohortes(): Promise<Cohorte[]> {
  const { data } = await createSupabaseServiceRole()
    .from("mia_cohortes")
    .select("id, nombre, clase1_en, activa")
    .order("created_at", { ascending: true });
  return (data ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    clase1En: (c.clase1_en as string | null) ?? null,
    activa: c.activa as boolean,
  }));
}

export interface FilaAlumno {
  userId: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  rol: string;
  privacidad: boolean;
  entrada: Entrada | null;
  cohorte: string | null;
  fichaCompleta: boolean;
  fichaVende: string | null;
  fichaAQuien: string | null;
  fichaQuiere: string | null;
  creadoEn: string;
}

interface InscRaw {
  entrada: Entrada;
  cohorte: { nombre: string } | { nombre: string }[] | null;
  ficha: { vende: string; a_quien: string; quiere: string }[] | { vende: string; a_quien: string; quiere: string } | null;
}

export async function listarAlumnos(): Promise<FilaAlumno[]> {
  const { data, error } = await createSupabaseServiceRole()
    .from("mia_perfiles")
    .select(
      "user_id, nombre, email, whatsapp, rol, privacidad_aceptada_en, created_at, " +
        "inscripciones:mia_inscripciones(entrada, cohorte:mia_cohortes(nombre), ficha:mia_fichas(vende, a_quien, quiere))",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`No se pudo leer el listado: ${error.message}`);

  const uno = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((p) => {
    const insc = uno(p.inscripciones as InscRaw[] | null);
    const ficha = insc ? uno(insc.ficha) : null;
    const cohorte = insc ? uno(insc.cohorte) : null;
    return {
      userId: p.user_id as string,
      nombre: p.nombre as string,
      email: p.email as string,
      whatsapp: (p.whatsapp as string | null) ?? null,
      rol: p.rol as string,
      privacidad: p.privacidad_aceptada_en !== null,
      entrada: insc?.entrada ?? null,
      cohorte: cohorte?.nombre ?? null,
      fichaCompleta: ficha !== null,
      fichaVende: ficha?.vende ?? null,
      fichaAQuien: ficha?.a_quien ?? null,
      fichaQuiere: ficha?.quiere ?? null,
      creadoEn: p.created_at as string,
    };
  });
}
