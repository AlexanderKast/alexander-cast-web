import "server-only";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { PRIVACIDAD_VERSION } from "./consentimiento";

/**
 * Registro público (cuenta gratuita, sin inscripción ni pedido).
 *
 * Flujo seguro:
 *   1. El formulario guarda un REGISTRO PENDIENTE (caduca a las 48 h) y envía
 *      un enlace al correo. No se crea perfil, ni sesión, ni nada pagado.
 *   2. Al canjear el enlace, Supabase confirma el correo (prueba de control).
 *   3. Solo entonces completarRegistro aplica los datos a ESA identidad
 *      verificada, y únicamente si todavía no tenía perfil.
 *
 * Nunca se modifica un perfil existente por conocer su correo, ni se tocan roles.
 */

const db = () => createSupabaseServiceRole();

export interface DatosRegistro {
  email: string; // en minúsculas
  nombre: string;
  whatsapp?: string;
  marketing: boolean;
}

/** Guarda el registro pendiente y devuelve su id (viaja en el enlace del correo). */
export async function guardarRegistroPendiente(d: DatosRegistro): Promise<string> {
  const ahora = new Date().toISOString();
  const { data, error } = await db()
    .from("mia_registros_pendientes")
    .insert({
      email_normalized: d.email,
      nombre: d.nombre,
      whatsapp: d.whatsapp ?? null,
      privacidad_aceptada_en: ahora,
      privacidad_version: PRIVACIDAD_VERSION,
      marketing_aceptado_en: d.marketing ? ahora : null,
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
): Promise<ResultadoRegistro> {
  const admin = db();
  const email = usuario.email.toLowerCase();

  // Retención acotada: lo vencido se borra siempre que alguien completa un registro.
  await admin.from("mia_registros_pendientes").delete().lt("expires_at", new Date().toISOString());

  const { data: pendiente } = await admin
    .from("mia_registros_pendientes")
    .select("id, nombre, whatsapp, privacidad_aceptada_en, privacidad_version, marketing_aceptado_en")
    .eq("id", registroId)
    .eq("email_normalized", email) // el registro solo vale para el correo que se verificó
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!pendiente) return "sin_pendiente";

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
    // 23505 = otro proceso (p. ej. el aprovisionamiento de una compra) creó el perfil a la vez: se respeta.
    if (error && error.code !== "23505") throw new Error(`Perfil: ${error.message}`);
    resultado = error ? "ya_existia" : "creado";
  }

  await admin.from("mia_registros_pendientes").delete().eq("id", pendiente.id as string);
  return resultado;
}
