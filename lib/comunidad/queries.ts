import { createSupabaseServiceRole } from "@/lib/supabase/server";

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

/** Ofertas a las que un admin puede dar de alta a alguien (con el nombre del programa y la cohorte). */
export interface OfertaAlta {
  id: string;
  productoId: string;
  productoNombre: string;
  slug: string;
  nombre: string;
  cohorteNombre: string | null;
}

export async function listarOfertasParaAlta(): Promise<OfertaAlta[]> {
  const { data } = await createSupabaseServiceRole()
    .from("mia_ofertas")
    .select("id, producto_id, slug, nombre, producto:mia_productos(nombre, estado), cohorte:mia_cohortes(nombre)")
    .eq("activa", true)
    .order("orden", { ascending: true });
  const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
  return ((data ?? []) as unknown as Record<string, unknown>[])
    .map((o) => ({ o, p: uno(o.producto as { nombre: string; estado: string } | null), c: uno(o.cohorte as { nombre: string } | null) }))
    .filter(({ p }) => p?.estado === "publicado")
    .map(({ o, p, c }) => ({
      id: o.id as string,
      productoId: o.producto_id as string,
      productoNombre: p?.nombre ?? "Programa",
      slug: o.slug as string,
      nombre: o.nombre as string,
      cohorteNombre: c?.nombre ?? null,
    }));
}

export interface FilaAlumno {
  userId: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  rol: string;
  privacidad: boolean;
  /** Programas con derecho (puede ser más de uno) y cómo lo obtuvo. */
  programas: { producto: string; oferta: string; estado: string; origen: string }[];
  fichaCompleta: boolean;
  fichaVende: string | null;
  fichaAQuien: string | null;
  fichaQuiere: string | null;
  creadoEn: string;
}

interface DerechoRaw {
  entrada: string;
  estado: string;
  origen: string;
  producto: { nombre: string } | { nombre: string }[] | null;
  ficha: { vende: string; a_quien: string; quiere: string }[] | { vende: string; a_quien: string; quiere: string } | null;
}

export async function listarAlumnos(): Promise<FilaAlumno[]> {
  const { data, error } = await createSupabaseServiceRole()
    .from("mia_perfiles")
    .select(
      "user_id, nombre, email, whatsapp, rol, privacidad_aceptada_en, created_at, " +
        "derechos:mia_inscripciones(entrada, estado, origen, producto:mia_productos(nombre), ficha:mia_fichas(vende, a_quien, quiere))",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`No se pudo leer el listado: ${error.message}`);

  const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((p) => {
    const derechos = (p.derechos as DerechoRaw[] | null) ?? [];
    const ficha = derechos.map((d) => uno(d.ficha)).find((f) => f !== null) ?? null;
    return {
      userId: p.user_id as string,
      nombre: p.nombre as string,
      email: p.email as string,
      whatsapp: (p.whatsapp as string | null) ?? null,
      rol: p.rol as string,
      privacidad: p.privacidad_aceptada_en !== null,
      programas: derechos.map((d) => ({
        producto: uno(d.producto)?.nombre ?? "Programa",
        oferta: d.entrada,
        estado: d.estado,
        origen: d.origen,
      })),
      fichaCompleta: ficha !== null,
      fichaVende: ficha?.vende ?? null,
      fichaAQuien: ficha?.a_quien ?? null,
      fichaQuiere: ficha?.quiere ?? null,
      creadoEn: p.created_at as string,
    };
  });
}
