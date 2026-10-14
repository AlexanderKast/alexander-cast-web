import "server-only";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { PRIVACIDAD_VERSION, UTM_CAMPOS, sanearUtm } from "./consentimiento";

/**
 * Registro público (cuenta gratuita, sin compra ni inscripción).
 *
 * Flujo seguro:
 *   1. El formulario guarda un REGISTRO PENDIENTE (caduca a las 48 h) y envía un enlace al correo. No se
 *      crea perfil, ni sesión, ni nada pagado.
 *   2. Al canjear el enlace, Supabase confirma el correo (prueba de control).
 *   3. Solo entonces completarRegistro aplica los datos a ESA identidad verificada, y únicamente si todavía
 *      no tenía perfil. Devuelve la INTENCIÓN (programa de interés, asesor) para continuar después de entrar.
 *
 * La intención (programa, oferta, asesor) es un dato de navegación y de contacto: NUNCA es autoridad de
 * precio ni de acceso. Nunca se modifica un perfil existente por conocer su correo, ni se tocan roles.
 */

const db = () => createSupabaseServiceRole();

export interface IntencionRegistro {
  productoSlug: string | null;
  ofertaSlug: string | null;
  /** Pidió que un asesor lo contacte. Exige consentimiento explícito para el canal elegido. */
  asesor: boolean;
  canal: "whatsapp" | "correo" | null;
  contactoAutorizadoEn: string | null;
  origen: "web" | "stand";
  utm: Record<string, string | null>;
}

export interface DatosRegistro {
  email: string; // en minúsculas
  nombre: string;
  whatsapp?: string;
  marketing: boolean;
  /** Intención ya validada por la acción (slugs con forma de slug; el programa se vuelve a validar al usarla). */
  intencion?: Partial<IntencionRegistro>;
}

/** Guarda el registro pendiente y devuelve su id (viaja en el enlace del correo). */
export async function guardarRegistroPendiente(d: DatosRegistro): Promise<string> {
  const ahora = new Date().toISOString();
  const i = d.intencion ?? {};
  const utm: Record<string, string | null> = {};
  for (const c of UTM_CAMPOS.slice(0, 3)) utm[c] = sanearUtm(i.utm?.[c]);

  const { data, error } = await db()
    .from("mia_registros_pendientes")
    .insert({
      email_normalized: d.email,
      nombre: d.nombre,
      whatsapp: d.whatsapp ?? null,
      privacidad_aceptada_en: ahora,
      privacidad_version: PRIVACIDAD_VERSION,
      marketing_aceptado_en: d.marketing ? ahora : null,
      producto_slug: i.productoSlug ?? null,
      oferta_slug: i.ofertaSlug ?? null,
      asesor: i.asesor === true,
      canal: i.asesor ? (i.canal ?? null) : null,
      contacto_autorizado_en: i.asesor && i.contactoAutorizadoEn ? i.contactoAutorizadoEn : null,
      origen: i.origen === "stand" ? "stand" : "web",
      ...utm,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`No se pudo guardar el registro: ${error?.message}`);
  return data.id as string;
}

export type ResultadoRegistro = "creado" | "ya_existia" | "sin_pendiente";

/**
 * Aplica el registro pendiente a una identidad YA verificada.
 * `usuario.email` debe venir de la sesión que acaba de crear verifyOtp, nunca del cliente.
 */
export async function completarRegistro(
  usuario: { id: string; email: string },
  registroId: string,
): Promise<{ resultado: ResultadoRegistro; intencion: IntencionRegistro | null }> {
  const admin = db();
  const email = usuario.email.toLowerCase();

  // Retención acotada: lo vencido se borra siempre que alguien completa un registro.
  await admin.from("mia_registros_pendientes").delete().lt("expires_at", new Date().toISOString());

  const { data: p } = await admin
    .from("mia_registros_pendientes")
    .select(
      "id, nombre, whatsapp, privacidad_aceptada_en, privacidad_version, marketing_aceptado_en, producto_slug, oferta_slug, asesor, canal, " +
        "contacto_autorizado_en, origen, utm_source, utm_medium, utm_campaign",
    )
    .eq("id", registroId)
    .eq("email_normalized", email) // el registro solo vale para el correo que se verificó
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!p) return { resultado: "sin_pendiente", intencion: null };
  const pendiente = p as unknown as Record<string, unknown>;

  const { data: perfil } = await admin.from("mia_perfiles").select("user_id").eq("user_id", usuario.id).maybeSingle();

  let resultado: ResultadoRegistro = "ya_existia";
  if (!perfil) {
    const { error } = await admin.from("mia_perfiles").insert({
      user_id: usuario.id,
      email,
      nombre: pendiente.nombre,
      whatsapp: pendiente.whatsapp,
      privacidad_aceptada_en: pendiente.privacidad_aceptada_en,
      privacidad_version: pendiente.privacidad_version,
      marketing_aceptado_en: pendiente.marketing_aceptado_en,
    });
    // 23505 = otro proceso creó el perfil a la vez (p. ej. un alta administrativa): se respeta, sin tocarlo.
    if (error && error.code !== "23505") throw new Error(`Perfil: ${error.message}`);
    resultado = error ? "ya_existia" : "creado";
  }

  const intencion: IntencionRegistro = {
    productoSlug: (pendiente.producto_slug as string | null) ?? null,
    ofertaSlug: (pendiente.oferta_slug as string | null) ?? null,
    asesor: pendiente.asesor === true,
    canal: (pendiente.canal as "whatsapp" | "correo" | null) ?? null,
    contactoAutorizadoEn: (pendiente.contacto_autorizado_en as string | null) ?? null,
    origen: pendiente.origen === "stand" ? "stand" : "web",
    utm: {
      utm_source: (pendiente.utm_source as string | null) ?? null,
      utm_medium: (pendiente.utm_medium as string | null) ?? null,
      utm_campaign: (pendiente.utm_campaign as string | null) ?? null,
    },
  };

  await admin.from("mia_registros_pendientes").delete().eq("id", pendiente.id as string);
  return { resultado, intencion };
}
