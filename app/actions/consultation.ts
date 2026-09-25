"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { consultationSchema } from "@/lib/validators";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendContactNotification } from "@/lib/resend";
import { formLimiter, emailLimiter, clientIp } from "@/lib/rate-limit";
import { logActivity } from "@/lib/admin/activity-logger";

export type ConsultationState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function consultationAction(
  _prev: ConsultationState,
  formData: FormData,
): Promise<ConsultationState> {
  const raw = {
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    mensaje: formData.get("mensaje"),
    slot: formData.get("slot") ?? undefined,
    website: formData.get("website") ?? undefined,
  };

  const parsed = consultationSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Revisa los datos del formulario.",
      fieldErrors,
    };
  }

  const { nombre, email, mensaje, slot } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const hdrs = await headers();
  const ip = clientIp(hdrs);

  const ipCheck = await formLimiter(`cs:ip:${ip}`);
  if (!ipCheck.success) {
    return {
      status: "error",
      message: "Muchos intentos seguidos. Prueba en unos minutos.",
    };
  }
  const emailCheck = await emailLimiter(`cs:em:${normalizedEmail}`);
  if (!emailCheck.success) {
    return {
      status: "error",
      message: "Ya recibimos tu solicitud. Te contacto pronto.",
    };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("ac_consultations").insert({
    email: normalizedEmail,
    nombre,
    mensaje,
    tipo_servicio: slot ?? null,
    status: "nuevo",
  });

  if (error) {
    return {
      status: "error",
      message: "No pudimos guardar tu solicitud. Intenta de nuevo.",
    };
  }

  await sendContactNotification({
    nombre,
    email: normalizedEmail,
    mensaje: `[Consultoria] ${mensaje}`,
    asunto: `Nueva solicitud de consultoria: ${nombre}`,
  });

  await logActivity({
    action: "consultation_requested",
    resourceType: "ac_consultations",
    metadata: { email: normalizedEmail, nombre, tipo: slot ?? null },
  });

  redirect("/gracias?t=consulta");
}
