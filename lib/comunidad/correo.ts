import { Resend } from "resend";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { rutaInternaPermitida } from "./acceso";
import { baseUrl } from "./url";

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
 *
 * Tipo de token: lo decide Supabase. Para una cuenta que ya existe es
 * «magiclink»; para un correo nuevo puede ser «signup». Se lee de
 * `properties.verification_type` y viaja en el enlace (lista cerrada), no se asume.
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

const esc = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const TIPOS_TOKEN_PERMITIDOS = ["magiclink", "signup"] as const;
export type TipoToken = (typeof TIPOS_TOKEN_PERMITIDOS)[number];

export const esTipoToken = (v: unknown): v is TipoToken =>
  typeof v === "string" && (TIPOS_TOKEN_PERMITIDOS as readonly string[]).includes(v);

export interface OpcionesEnlace {
  /** Ruta interna a la que volver tras entrar (lista cerrada, ver acceso.ts). */
  next?: string | null;
  /** Registro pendiente que se aplica SOLO si quien abre el enlace verifica ese mismo correo. */
  registroId?: string;
}

/**
 * Genera el enlace de acceso. Si el correo no existe en auth, Supabase crea la
 * cuenta SIN confirmar (se confirma al canjear el enlace, que prueba el control del correo).
 */
export async function generarEnlaceAcceso(email: string, opts: OpcionesEnlace = {}): Promise<string | null> {
  const admin = createSupabaseServiceRole();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hash = data?.properties?.hashed_token;
  if (error || !hash) return null;

  const tipo = esTipoToken(data?.properties?.verification_type) ? data.properties.verification_type : "magiclink";
  const url = new URL(`${baseUrl()}/comunidad/auth/confirmar`);
  url.searchParams.set("token_hash", hash);
  url.searchParams.set("type", tipo);
  if (opts.registroId) url.searchParams.set("reg", opts.registroId);
  const next = rutaInternaPermitida(opts.next);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

type Variante = "acceso" | "compra" | "registro";

function cuerpoCorreo(nombre: string, enlace: string, variante: Variante) {
  const textos: Record<Variante, { subject: string; intro: string; introTxt: string; boton: string }> = {
    acceso: {
      subject: "Tu acceso a Master IA 360",
      intro: "Este es tu acceso a la plataforma de <strong>Master IA 360</strong>. Sin contraseña: toca el botón y entras.",
      introTxt: "Tu acceso a Master IA 360:",
      boton: "Entrar a la plataforma",
    },
    compra: {
      subject: "Pago recibido: ya eres parte de Master IA 360",
      intro:
        "Recibimos tu pago, ¡bienvenido a <strong>Master IA 360</strong>! Tu cuenta ya está lista. Sin contraseña: toca el botón y entras.",
      introTxt: "Recibimos tu pago, bienvenido a Master IA 360. Tu cuenta ya está lista.",
      boton: "Entrar a la plataforma",
    },
    registro: {
      subject: "Confirma tu correo para crear tu cuenta de Master IA 360",
      intro:
        "Para terminar de crear tu cuenta en <strong>Master IA 360</strong>, confirma que este correo es tuyo. La cuenta no incluye el programa: la compra es aparte.",
      introTxt: "Confirma tu correo para terminar de crear tu cuenta en Master IA 360 (el programa se compra aparte):",
      boton: "Confirmar mi correo",
    },
  };
  const t = textos[variante];
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0A0A0A;max-width:520px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;margin:0 0 16px;">Hola ${esc(nombre)},</h1>
      <p style="font-size:16px;line-height:1.6;">${t.intro}</p>
      <p style="margin:28px 0;">
        <a href="${esc(enlace)}" style="background:#A3E635;color:#050705;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">${t.boton}</a>
      </p>
      <p style="font-size:14px;line-height:1.6;color:#555;">El enlace funciona una sola vez y vence en 1 hora. Si caduca, entra a <a href="${baseUrl()}/comunidad/login">${baseUrl().replace(/^https?:\/\//, "")}/comunidad/login</a> y pide otro.</p>
      <p style="font-size:14px;line-height:1.6;color:#555;">Si no esperabas este correo, ignóralo: no se crea ni se cambia nada.</p>
      <p style="font-size:16px;margin-top:24px;">Alexander Cast</p>
    </div>`;
  const text = `Hola ${nombre},\n\n${t.introTxt} ${enlace}\n\nFunciona una sola vez y vence en 1 hora. Si no esperabas este correo, ignóralo.\n\nAlexander Cast`;
  return { subject: t.subject, html, text };
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string };

export async function enviarAcceso(
  email: string,
  nombre: string,
  opts: { compra?: boolean; next?: string | null } = {},
): Promise<ResultadoEnvio> {
  try {
    const enlace = await generarEnlaceAcceso(email, { next: opts.next });
    if (!enlace) return { ok: false, error: "No se pudo generar el enlace." };
    const { subject, html, text } = cuerpoCorreo(nombre, enlace, opts.compra ? "compra" : "acceso");
    const { error } = await resend().emails.send({ from: remitente(), to: email, subject, html, text });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

/** Correo de verificación del registro: el enlace lleva el id del registro pendiente. */
export async function enviarVerificacionRegistro(
  email: string,
  nombre: string,
  registroId: string,
): Promise<ResultadoEnvio> {
  try {
    // Sin `next`: al verificar, el servidor decide el destino según la intención guardada con el registro.
    const enlace = await generarEnlaceAcceso(email, { registroId });
    if (!enlace) return { ok: false, error: "No se pudo generar el enlace." };
    const { subject, html, text } = cuerpoCorreo(nombre, enlace, "registro");
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
      mensajes.push({ from: remitente(), to: d.email, ...cuerpoCorreo(d.nombre, enlace, "acceso") });
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
