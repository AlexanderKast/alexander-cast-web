"use server";

import { headers } from "next/headers";
import { baseUrl } from "@/lib/comunidad/url";
import { origenPublico } from "@/lib/imt/origen";
import { referidorSchema } from "@/lib/imt/pagos";
import { registrarReferidor } from "@/lib/imt/referidos";
import { clientIp, emailLimiter, formLimiter } from "@/lib/rate-limit";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

export type ReferidoState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function registrarReferidorAction(_prev: ReferidoState, formData: FormData): Promise<ReferidoState> {
  const parsed = referidorSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    whatsapp: formData.get("whatsapp"),
    acepta: formData.get("acepta") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors };
  }

  // Honeypot: un bot que llena este campo ve "éxito" y no se guarda nada.
  if (formData.get("website")) return { status: "success" };

  const cabeceras = await headers();
  const ip = clientIp(cabeceras);
  if (!(await formLimiter(`ref:ip:${ip}`)).success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba de nuevo en unos minutos." };
  }
  if (!(await emailLimiter(`ref:em:${parsed.data.email}`)).success) {
    return { status: "error", message: "Ya pediste tu enlace con este correo. Revisa tu bandeja de entrada y spam." };
  }

  const r = await registrarReferidor(
    createSupabaseServiceRole(),
    parsed.data,
    origenPublico(cabeceras, baseUrl()),
  );
  if (!r.ok) return { status: "error", message: r.error };
  return { status: "success" };
}
