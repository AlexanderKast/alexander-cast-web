"use server";

import { headers } from "next/headers";
import { clientIp, emailLimiter, formLimiter } from "@/lib/rate-limit";
import { isSameOriginStrict } from "@/lib/same-origin";
import { informacionSchema } from "@/lib/comunidad/validators";
import { UTM_CAMPOS } from "@/lib/comunidad/consentimiento";
import { guardarSolicitud, type Intencion } from "@/lib/comunidad/leads";
import { nivelesDisponibles } from "@/lib/comunidad/oferta";
import { cuposRestantes } from "@/lib/comunidad/pedidos";

/**
 * Solicitar información / lista de espera.
 * Crea ÚNICAMENTE un lead. Nunca: cuenta, sesión, pedido, checkout ni reserva de cupo.
 * Éxito solo si la solicitud quedó persistida. No revela si un correo ya existe.
 */

export type EstadoInformacion =
  | { status: "idle" }
  | { status: "ok"; intencion: Intencion }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function solicitarInformacion(_p: EstadoInformacion, fd: FormData): Promise<EstadoInformacion> {
  if (fd.get("website")) return { status: "error", message: "Solicitud no válida." }; // honeypot

  const hdrs = await headers();
  if (!isSameOriginStrict(hdrs)) return { status: "error", message: "Solicitud no válida." };

  const parsed = informacionSchema.safeParse({
    nombre: fd.get("nombre"),
    email: fd.get("email"),
    whatsapp: fd.get("whatsapp") ?? "",
    privacidad: fd.get("privacidad") ?? "no",
    marketing: fd.get("marketing") ?? undefined,
    request_key: fd.get("request_key"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "form");
      if (!fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { status: "error", message: "Revisa los datos.", fieldErrors };
  }
  const d = parsed.data;

  const porIp = await formLimiter(`mia:info:ip:${clientIp(hdrs)}`);
  const porCorreo = await emailLimiter(`mia:info:em:${d.email}`);
  if (!porIp.success || !porCorreo.success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };
  }

  // La intención la decide el servidor: con inscripciones cerradas o cupos agotados es lista de espera.
  let intencion: Intencion = "informacion";
  if (nivelesDisponibles().length === 0) {
    intencion = "lista_espera";
  } else {
    const cupos = await cuposRestantes().catch(() => null); // si falla, sigue siendo información
    if (cupos && cupos.total <= 0) intencion = "lista_espera";
  }

  const utm: Record<string, unknown> = {};
  for (const c of UTM_CAMPOS) utm[c] = fd.get(c);

  const guardado = await guardarSolicitud({
    requestKey: d.request_key,
    nombre: d.nombre,
    email: d.email,
    whatsapp: d.whatsapp,
    intencion,
    origen: fd.get("o") === "stand" ? "stand" : "web",
    marketing: d.marketing === "on",
    utm,
  });

  if (!guardado) {
    return { status: "error", message: "No pudimos guardar tu solicitud. Intenta de nuevo en unos segundos." };
  }
  return { status: "ok", intencion };
}
