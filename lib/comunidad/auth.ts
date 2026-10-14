import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase/server";
import { destinoPorEstado, inscripcionVigente, type DestinoAcceso } from "./acceso";
import type { RolPlataforma } from "./oportunidades-reglas";

export type RolComunidad = RolPlataforma;

/** Un derecho de acceso VIGENTE sobre un programa (y cohorte, si la tiene). Una persona puede tener varios. */
export interface DerechoVigente {
  id: string;
  productoId: string;
  productoSlug: string;
  productoNombre: string;
  ofertaId: string | null;
  /** Slug de la oferta con la que entró (p. ej. preventa, vip). */
  entrada: string;
  cohorte: { id: string; nombre: string; clase1En: string | null } | null;
  /** Derechos que otorga la oferta (sesion_arranque, sesion_1a1…). */
  derechos: string[];
  comunidadVenceEn: string | null;
  origen: string;
}

export interface Miembro {
  userId: string;
  email: string;
  nombre: string;
  whatsapp: string | null;
  rol: RolComunidad;
  privacidadAceptada: boolean;
  /** Derechos vigentes, uno por programa/cohorte. Vacío = cuenta sin compras: entra al panel y al catálogo igual. */
  derechos: DerechoVigente[];
  /** Hubo derechos pero ninguno sigue vigente (revocado o vencido). */
  derechosNoVigentes: boolean;
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

const COLS_DERECHO =
  "id, producto_id, oferta_id, entrada, estado, origen, derechos, comunidad_vence_en, " +
  "producto:mia_productos(id, slug, nombre), cohorte:mia_cohortes(id, nombre, clase1_en)";

type Unico<T> = T | T[] | null;
interface FilaDerecho {
  id: string;
  producto_id: string;
  oferta_id: string | null;
  entrada: string;
  estado: string;
  origen: string;
  derechos: string[] | null;
  comunidad_vence_en: string | null;
  producto: Unico<{ id: string; slug: string; nombre: string }>;
  cohorte: Unico<{ id: string; nombre: string; clase1_en: string | null }>;
}
const uno = <T,>(v: Unico<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/**
 * Derechos de una cuenta. Se leen con el servidor y a partir de un id YA verificado (nunca de datos del
 * cliente): así «Mis programas» sigue mostrando un programa aunque luego se archive en el catálogo.
 */
export async function derechosDeUsuario(userId: string): Promise<{ vigentes: DerechoVigente[]; hubo: boolean }> {
  const { data } = await createSupabaseServiceRole()
    .from("mia_inscripciones")
    .select(COLS_DERECHO)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const filas = (data ?? []) as unknown as FilaDerecho[];

  const vigentes: DerechoVigente[] = [];
  for (const f of filas) {
    if (!inscripcionVigente({ estado: f.estado, comunidadVenceEn: f.comunidad_vence_en })) continue;
    const p = uno(f.producto);
    if (!p) continue;
    const c = uno(f.cohorte);
    vigentes.push({
      id: f.id,
      productoId: f.producto_id,
      productoSlug: p.slug,
      productoNombre: p.nombre,
      ofertaId: f.oferta_id,
      entrada: f.entrada,
      cohorte: c ? { id: c.id, nombre: c.nombre, clase1En: c.clase1_en } : null,
      derechos: f.derechos ?? [],
      comunidadVenceEn: f.comunidad_vence_en,
      origen: f.origen,
    });
  }
  return { vigentes, hubo: filas.length > 0 };
}

/** Miembro de la plataforma con sesión, o null. Un usuario de auth sin perfil NO es miembro. */
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
        { user_id: user.id, email: user.email.toLowerCase(), nombre: user.email.split("@")[0], rol: "admin" },
        { onConflict: "user_id" },
      )
      .select("nombre, whatsapp, rol, privacidad_aceptada_en")
      .single<FilaPerfil>();
    perfil = data;
  }
  if (!perfil) return null;

  const { vigentes, hubo } = await derechosDeUsuario(user.id);

  return {
    userId: user.id,
    email: user.email,
    nombre: perfil.nombre,
    whatsapp: perfil.whatsapp,
    rol: perfil.rol,
    privacidadAceptada: perfil.privacidad_aceptada_en !== null,
    derechos: vigentes,
    derechosNoVigentes: hubo && vigentes.length === 0,
  };
});

export const derechoDe = (m: Miembro, productoSlug: string): DerechoVigente | null =>
  m.derechos.find((d) => d.productoSlug === productoSlug) ?? null;

/** Adónde debe ir un miembro ya cargado, según el contrato central de acceso. */
export function destinoDeMiembro(m: Miembro | null): DestinoAcceso {
  return destinoPorEstado({
    conSesion: m !== null,
    tienePerfil: m !== null,
    privacidadAceptada: m?.privacidadAceptada ?? false,
  });
}

/**
 * Destino de un usuario YA verificado, calculado con service role a partir de su id (para el canje del
 * enlace, donde las cookies de la nueva sesión todavía no se leen en la misma petición).
 */
export async function destinoDeUsuario(userId: string): Promise<DestinoAcceso> {
  const { data: perfil } = await createSupabaseServiceRole()
    .from("mia_perfiles")
    .select("privacidad_aceptada_en")
    .eq("user_id", userId)
    .maybeSingle();
  return destinoPorEstado({
    conSesion: true,
    tienePerfil: perfil !== null,
    privacidadAceptada: perfil?.privacidad_aceptada_en != null,
  });
}

/** Cuenta de la plataforma (con perfil) que ya aceptó el aviso de privacidad. NO exige ninguna compra. */
export async function requireMiembro(): Promise<Miembro> {
  const m = await getMiembro();
  if (!m) redirect("/comunidad/login");
  if (!m.privacidadAceptada) redirect("/comunidad/bienvenida");
  return m;
}

/** Igual que requireMiembro pero sin exigir la privacidad (solo para la propia pantalla de bienvenida). */
export async function requireMiembroSinPrivacidad(): Promise<Miembro> {
  const m = await getMiembro();
  if (!m) redirect("/comunidad/login");
  return m;
}

/**
 * Contenido pagado de UN programa: exige el derecho vigente sobre ese programa. Sin él, vuelve al detalle
 * del programa (donde se puede comprar); el resto de la plataforma sigue disponible.
 */
export async function requireDerecho(productoSlug: string): Promise<{ miembro: Miembro; derecho: DerechoVigente }> {
  const miembro = await requireMiembro();
  const derecho = derechoDe(miembro, productoSlug);
  if (!derecho) redirect(`/comunidad/programas/${productoSlug}`);
  return { miembro, derecho };
}

export async function requireAdminComunidad(): Promise<Miembro> {
  const m = await requireMiembro();
  if (m.rol !== "admin") redirect("/comunidad");
  return m;
}

/** Admin o comercial (la venta asistida). El comercial NO es admin ni staff. */
export async function requireComercial(): Promise<Miembro> {
  const m = await requireMiembro();
  if (m.rol !== "admin" && m.rol !== "comercial") redirect("/comunidad");
  return m;
}
