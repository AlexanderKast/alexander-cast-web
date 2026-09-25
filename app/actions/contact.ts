"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { contactSchema } from "@/lib/validators";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendContactNotification } from "@/lib/resend";
import { formLimiter, emailLimiter, clientIp } from "@/lib/rate-limit";
import { logActivity } from "@/lib/admin/activity-logger";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function contactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const raw = {
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    mensaje: formData.get("mensaje"),
    website: formData.get("website") ?? undefined,
  };

  const parsed = contactSchema.safeParse(raw);
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

  const { nombre, email, mensaje } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const hdrs = await headers();
  const ip = clientIp(hdrs);

  const ipCheck = await formLimiter(`ct:ip:${ip}`);
  if (!ipCheck.success) {
    return {
      status: "error",
      message: "Muchos intentos seguidos. Prueba en unos minutos.",
    };
  }
  const emailCheck = await emailLimiter(`ct:em:${normalizedEmail}`);
  if (!emailCheck.success) {
    return {
      status: "error",
      message: "Ya recibimos tu mensaje. Te escribo pronto.",
    };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("ac_contacts").insert({
    email: normalizedEmail,
    nombre,
    mensaje,
    origen: "home",
  });

  if (error) {
    return {
      status: "error",
      message: "No pudimos guardar tu mensaje. Intenta de nuevo.",
    };
  }

  await sendContactNotification({
    nombre,
    email: normalizedEmail,
    mensaje,
  });

  await logActivity({
    action: "contact_form_sent",
    resourceType: "ac_contacts",
    metadata: { email: normalizedEmail, nombre },
  });

  redirect("/gracias?t=contacto");
}
