"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { subscribeSchema } from "@/lib/validators";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/resend";
import { formLimiter, emailLimiter, clientIp } from "@/lib/rate-limit";
import { logActivity } from "@/lib/admin/activity-logger";

export type SubscribeState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const raw = {
    email: formData.get("email"),
    source: formData.get("source") ?? undefined,
    pilar: formData.get("pilar") ?? undefined,
    website: formData.get("website") ?? undefined,
  };

  const parsed = subscribeSchema.safeParse(raw);
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

  const { email, source, pilar } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const hdrs = await headers();
  const ip = clientIp(hdrs);

  const ipCheck = await formLimiter(`sub:ip:${ip}`);
  if (!ipCheck.success) {
    return {
      status: "error",
      message: "Muchos intentos seguidos. Prueba en unos minutos.",
    };
  }
  const emailCheck = await emailLimiter(`sub:em:${normalizedEmail}`);
  if (!emailCheck.success) {
    return {
      status: "error",
      message: "Ya recibimos tu solicitud. Revisa tu bandeja de entrada.",
    };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("ac_subscribers")
    .upsert(
      {
        email: normalizedEmail,
        source: source ?? "home",
        pilar_interest: pilar ?? null,
      },
      { onConflict: "email", ignoreDuplicates: false },
    );

  if (error) {
    return {
      status: "error",
      message: "No pudimos registrar tu correo. Intenta de nuevo.",
    };
  }

  await sendWelcomeEmail({ to: normalizedEmail });

  await logActivity({
    action: "newsletter_subscribed",
    resourceType: "ac_subscribers",
    metadata: { email: normalizedEmail, source: source ?? "home", pilar },
  });

  redirect("/gracias?t=newsletter");
}
