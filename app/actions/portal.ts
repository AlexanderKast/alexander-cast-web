"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import type { EstadoForm } from "@/app/comunidad/actions";
import { origenPublico } from "@/lib/imt/origen";
import { reenviarAcceso } from "@/lib/imt/portal";
import { baseUrl } from "@/lib/comunidad/url";
import { clientIp, emailLimiter, formLimiter } from "@/lib/rate-limit";
import { isSameOriginStrict } from "@/lib/same-origin";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

const correoSchema = z.string().trim().toLowerCase().email().max(160);

/** Misma respuesta exista o no el correo: no se revela quién tiene portal. */
const RESPUESTA_GENERICA =
  "Si ese correo tiene un portal, te enviamos un enlace para entrar. Revisa tu bandeja y la carpeta de spam; vence en 1 hora.";

/** Pide el enlace mágico al portal de clientes. */
export async function solicitarAccesoPortal(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  // Honeypot: un humano no llena este campo.
  if (fd.get("website")) return { status: "ok", message: RESPUESTA_GENERICA };

  const cabeceras = await headers();
  if (!isSameOriginStrict(cabeceras)) return { status: "error", message: "Solicitud no válida." };

  const parsed = correoSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { status: "error", message: "Escribe un correo válido." };
  const email = parsed.data;

  const porIp = await formLimiter(`portal:ip:${clientIp(cabeceras)}`);
  const porCorreo = await emailLimiter(`portal:em:${email}`);
  if (!porIp.success || !porCorreo.success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };
  }

  if (!process.env.RESEND_API_KEY || !(process.env.RESEND_FROM || process.env.COMUNIDAD_RESEND_FROM)) {
    console.error("[imt-portal] faltan RESEND_API_KEY / RESEND_FROM: el enlace no saldría.");
    return { status: "error", message: "El envío de correos no está configurado. Escríbenos por WhatsApp." };
  }

  const base = origenPublico(cabeceras, baseUrl());
  // El envío va después de responder para que el tiempo de respuesta tampoco delate si el correo existe.
  after(async () => {
    try {
      await reenviarAcceso(createSupabaseServiceRole(), email, base);
    } catch (e) {
      console.error("[imt-portal] fallo enviando acceso:", e);
    }
  });

  return { status: "ok", message: RESPUESTA_GENERICA };
}
