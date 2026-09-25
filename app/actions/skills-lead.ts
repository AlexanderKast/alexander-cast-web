"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { formLimiter, emailLimiter, clientIp } from "@/lib/rate-limit";
import {
  COUNTRY_CODES,
  SKILLS_PRO_SLUG,
} from "@/components/sections/skills-landing/data";

export type SkillsLeadState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const validCodes = new Set<string>(COUNTRY_CODES.map((c) => c.code));

const honeypot = z
  .string()
  .max(0, "Solicitud invalida")
  .optional()
  .or(z.literal(""));

const skillsLeadSchema = z.object({
  nombre: z
    .string({ message: "El nombre es obligatorio" })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo"),
  countryCode: z
    .string({ message: "Selecciona tu país" })
    .trim()
    .refine((c) => validCodes.has(c), "Selecciona un código de país válido"),
  whatsapp: z
    .string({ message: "El WhatsApp es obligatorio" })
    .trim()
    .transform((v) => v.replace(/[\s().-]/g, ""))
    .refine((v) => /^\d{7,12}$/.test(v), "Ingresa un número válido (solo dígitos)"),
  website: honeypot,
});

export async function skillsLeadAction(
  _prev: SkillsLeadState,
  formData: FormData,
): Promise<SkillsLeadState> {
  const raw = {
    nombre: formData.get("nombre"),
    countryCode: formData.get("countryCode"),
    whatsapp: formData.get("whatsapp"),
    website: formData.get("website") ?? undefined,
  };

  const parsed = skillsLeadSchema.safeParse(raw);
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

  const { nombre, countryCode, whatsapp } = parsed.data;
  const fullNumber = `${countryCode}${whatsapp}`;

  const hdrs = await headers();
  const ip = clientIp(hdrs);

  const ipCheck = await formLimiter(`sk:ip:${ip}`);
  if (!ipCheck.success) {
    return {
      status: "error",
      message: "Muchos intentos seguidos. Prueba en unos minutos.",
    };
  }
  const numberCheck = await emailLimiter(`sk:wa:${fullNumber}`);
  if (!numberCheck.success) {
    return {
      status: "error",
      message: "Este número ya está registrado. Ve directo a la página de descarga.",
    };
  }

  // DB dedicada para leads de /skills (aislada del portal).
  // La clave anon solo permite INSERT en skills_leads vía RLS.
  const url = process.env.SKILLS_SUPABASE_URL;
  const anonKey = process.env.SKILLS_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      status: "error",
      message: "El registro no está disponible en este momento. Intenta más tarde.",
    };
  }
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const { error: insertErr } = await supabase.from("skills_leads").insert({
    nombre,
    whatsapp: fullNumber,
    lead_magnet_slug: SKILLS_PRO_SLUG,
    source: "skills-pro",
  });

  // 23505 = whatsapp duplicado: ya es lead, lo dejamos pasar a la descarga.
  if (insertErr && insertErr.code !== "23505") {
    return {
      status: "error",
      message: "No pudimos registrar tus datos. Intenta de nuevo.",
    };
  }

  redirect(`/skills/gracias?nombre=${encodeURIComponent(nombre)}`);
}
