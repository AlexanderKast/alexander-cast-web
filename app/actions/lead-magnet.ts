"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { leadMagnetSchema } from "@/lib/validators";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendLeadMagnetEmail } from "@/lib/resend";
import { formLimiter, emailLimiter, clientIp } from "@/lib/rate-limit";
import { leadMagnets } from "@/content/lead-magnets";
import { logActivity } from "@/lib/admin/activity-logger";

export type LeadMagnetState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

export async function leadMagnetAction(
  _prev: LeadMagnetState,
  formData: FormData,
): Promise<LeadMagnetState> {
  const raw = {
    email: formData.get("email"),
    nombre: formData.get("nombre") ?? undefined,
    leadMagnetSlug: formData.get("leadMagnetSlug"),
    website: formData.get("website") ?? undefined,
  };

  const parsed = leadMagnetSchema.safeParse(raw);
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

  const { email, leadMagnetSlug, nombre } = parsed.data;
  const magnet = leadMagnets.find((m) => m.slug === leadMagnetSlug);
  if (!magnet) {
    return { status: "error", message: "Recurso no encontrado." };
  }

  const normalizedEmail = email.toLowerCase();
  const hdrs = await headers();
  const ip = clientIp(hdrs);

  const ipCheck = await formLimiter(`lm:ip:${ip}`);
  if (!ipCheck.success) {
    return {
      status: "error",
      message: "Muchos intentos seguidos. Prueba en unos minutos.",
    };
  }
  const emailCheck = await emailLimiter(`lm:em:${normalizedEmail}:${leadMagnetSlug}`);
  if (!emailCheck.success) {
    return {
      status: "error",
      message: "Ya enviamos este recurso a tu correo. Revisa la bandeja de entrada.",
    };
  }

  const supabase = getSupabaseServerClient();

  let downloadUrl = magnet.externalUrl ?? "";
  let expiresAt: Date | null = null;

  if (!downloadUrl) {
    const { data: signed, error: signedErr } = await supabase.storage
      .from("ac-lead-magnets")
      .createSignedUrl(`${leadMagnetSlug}.pdf`, SIGNED_URL_SECONDS);
    if (signedErr || !signed?.signedUrl) {
      return {
        status: "error",
        message: "No pudimos generar el enlace de descarga. Escribenos a soporte.",
      };
    }
    downloadUrl = signed.signedUrl;
    expiresAt = new Date(Date.now() + SIGNED_URL_SECONDS * 1000);
  }

  const { error: insertErr } = await supabase.from("ac_leads").insert({
    email: normalizedEmail,
    nombre: nombre ?? null,
    lead_magnet_slug: leadMagnetSlug,
    delivered_at: new Date().toISOString(),
    delivery_url_expires_at: expiresAt?.toISOString() ?? null,
    source: "home",
  });

  if (insertErr) {
    return {
      status: "error",
      message: "No pudimos registrar tu descarga. Intenta de nuevo.",
    };
  }

  await supabase.from("ac_subscribers").upsert(
    {
      email: normalizedEmail,
      source: `lead-magnet:${leadMagnetSlug}`,
      pilar_interest: magnet.pilar ?? null,
    },
    { onConflict: "email", ignoreDuplicates: true },
  );

  await sendLeadMagnetEmail({
    to: normalizedEmail,
    nombre,
    leadMagnetTitulo: magnet.titulo,
    downloadUrl,
  });

  await logActivity({
    action: "lead_magnet_downloaded",
    resourceType: "ac_leads",
    metadata: { email: normalizedEmail, leadMagnetSlug, nombre: nombre ?? null },
  });

  redirect(`/gracias?t=lead&slug=${encodeURIComponent(leadMagnetSlug)}`);
}
