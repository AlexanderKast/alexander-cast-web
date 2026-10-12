import { Resend } from "resend";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

/**
 * Correos de acceso de la comunidad.
 *
 * El enlace mágico NO sale del SMTP de Supabase: se genera con
 * auth.admin.generateLink (sin enviar nada) y se manda por Resend. Así:
 *   - no dependemos del límite horario del SMTP por defecto de Supabase,
 *   - no hay que tocar las plantillas de Auth que usa el login de admin,
 *   - el enlace funciona abierto en CUALQUIER dispositivo (el alta se hace
 *     desde el celular del admin, el alumno abre el correo en el suyo; con
 *     PKCE el enlace solo serviría en el navegador que lo pidió).
 *
 * El enlace apunta a una página con un botón (no verifica al abrirse): los
 * escáneres de correo abren los enlaces y se gastarían el token de un solo uso.
 */

let cliente: Resend | null = null;
function resend(): Resend {
  if (cliente) return cliente;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY");
  cliente = new Resend(key);
  return cliente;
}

function remitente(): string {
  const from = process.env.COMUNIDAD_RESEND_FROM ?? process.env.RESEND_FROM;
  if (!from) throw new Error("Falta RESEND_FROM (o COMUNIDAD_RESEND_FROM)");
  return from;
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

const esc = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Genera el enlace de acceso para un correo que ya existe en auth. */
export async function generarEnlaceAcceso(email: string): Promise<string | null> {
  const admin = createSupabaseServiceRole();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hash = data?.properties?.hashed_token;
  if (error || !hash) return null;
  return `${baseUrl()}/comunidad/auth/confirmar?token_hash=${encodeURIComponent(hash)}`;
}

function cuerpoCorreo(nombre: string, enlace: string, compra = false) {
  const subject = compra ? "Pago recibido: ya eres parte de Master IA 360" : "Tu acceso a Master IA 360";
  const intro = compra
    ? "Recibimos tu pago, ¡bienvenido a <strong>Master IA 360</strong>! Tu cuenta ya está lista. Sin contraseña: toca el botón y entras."
    : "Este es tu acceso a la plataforma de <strong>Master IA 360</strong>. Sin contraseña: toca el botón y entras.";
  const introTxt = compra
    ? "Recibimos tu pago, bienvenido a Master IA 360. Tu cuenta ya está lista."
    : "Tu acceso a Master IA 360:";
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0A0A0A;max-width:520px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;margin:0 0 16px;">Hola ${esc(nombre)},</h1>
      <p style="font-size:16px;line-height:1.6;">${intro}</p>
      <p style="margin:28px 0;">
        <a href="${esc(enlace)}" style="background:#D4AF37;color:#0A0A0A;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Entrar a la plataforma</a>
      </p>
      <p style="font-size:14px;line-height:1.6;color:#555;">El enlace funciona una sola vez y vence en 1 hora. Si caduca, entra a <a href="${baseUrl()}/comunidad/login">${baseUrl().replace(/^https?:\/\//, "")}/comunidad/login</a> y pide otro.</p>
      <p style="font-size:14px;line-height:1.6;color:#555;">Si no esperabas este correo, ignóralo.</p>
      <p style="font-size:16px;margin-top:24px;">Alexander Cast</p>
    </div>`;
  const text = `Hola ${nombre},\n\n${introTxt} ${enlace}\n\nFunciona una sola vez y vence en 1 hora.\n\nAlexander Cast`;
  return { subject, html, text };
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string };

export async function enviarAcceso(
  email: string,
  nombre: string,
  opts: { compra?: boolean } = {},
): Promise<ResultadoEnvio> {
  try {
    const enlace = await generarEnlaceAcceso(email);
    if (!enlace) return { ok: false, error: "No se pudo generar el enlace." };
    const { subject, html, text } = cuerpoCorreo(nombre, enlace, opts.compra);
    const { error } = await resend().emails.send({ from: remitente(), to: email, subject, html, text });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

/**
 * Envío en lote por Resend (hasta 100 por llamada; el envío uno a uno topa
 * con el límite de 2 req/s). Devuelve los correos que fallaron.
 */
export async function enviarAccesosEnLote(
  destinatarios: { email: string; nombre: string }[],
): Promise<{ enviados: number; fallidos: string[] }> {
  let enviados = 0;
  const fallidos: string[] = [];

  for (let i = 0; i < destinatarios.length; i += 50) {
    const tanda = destinatarios.slice(i, i + 50);
    const mensajes: { from: string; to: string; subject: string; html: string; text: string }[] = [];
    const correosTanda: string[] = [];

    for (const d of tanda) {
      const enlace = await generarEnlaceAcceso(d.email);
      if (!enlace) {
        fallidos.push(d.email);
        continue;
      }
      mensajes.push({ from: remitente(), to: d.email, ...cuerpoCorreo(d.nombre, enlace) });
      correosTanda.push(d.email);
    }
    if (!mensajes.length) continue;

    try {
      const { error } = await resend().batch.send(mensajes);
      if (error) fallidos.push(...correosTanda);
      else enviados += mensajes.length;
    } catch {
      fallidos.push(...correosTanda);
    }
  }
  return { enviados, fallidos };
}
