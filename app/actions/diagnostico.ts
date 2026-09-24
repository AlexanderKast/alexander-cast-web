"use server";

import { headers } from "next/headers";
import {
  diagnosticoFromFormData,
  diagnosticoSchema,
  EQUIPO_OPTIONS,
  fieldErrorsFrom,
  HERRAMIENTAS_OPTIONS,
  INVERSION_OPTIONS,
  labelFor,
  VENTAS_OPTIONS,
  type FieldErrors,
} from "@/lib/imt/diagnostico";
import { planName, type PlanId } from "@/content/imt";
import { whatsappUrl } from "@/site.config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendDiagnosticoNotification } from "@/lib/resend";
import { formLimiter, emailLimiter } from "@/lib/rate-limit";
import { logActivity } from "@/lib/admin/activity-logger";

export type DiagnosticoState =
  | { status: "idle" }
  /** whatsappUrl is only handed out after a valid, saved registration. */
  | { status: "success"; empresa: string; plan: PlanId | null; whatsappUrl: string | null }
  | { status: "error"; message: string; fieldErrors?: FieldErrors };

export async function diagnosticoAction(
  _prev: DiagnosticoState,
  formData: FormData,
): Promise<DiagnosticoState> {
  const parsed = diagnosticoSchema.safeParse(diagnosticoFromFormData(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;
  // Honeypot filled: pretend success so bots learn nothing.
  if (data.website) {
    return { status: "success", empresa: data.empresa, plan: data.plan ?? null, whatsappUrl: null };
  }

  const email = data.email.toLowerCase();
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown";

  const ipCheck = await formLimiter(`dg:ip:${ip}`);
  if (!ipCheck.success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba de nuevo en unos minutos." };
  }
  const emailCheck = await emailLimiter(`dg:em:${email}`);
  if (!emailCheck.success) {
    return {
      status: "error",
      message: "Ya recibimos un diagnóstico con este correo. Te escribimos en menos de 24 horas hábiles.",
    };
  }

  const herramientas = [...new Set(data.herramientas)];
  const supabase = getSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("imt_diagnosticos")
    .insert({
      nombre: data.nombre,
      empresa: data.empresa,
      cargo: data.cargo ?? null,
      whatsapp: data.whatsapp,
      email,
      ventas_mensuales: data.ventas ?? null,
      tamano_equipo: data.equipo ?? null,
      dolor: data.dolor,
      herramientas,
      herramientas_otras: herramientas.includes("otras") ? (data.herramientasOtras ?? null) : null,
      inversion_mensual: data.inversion ?? null,
      plan: data.plan ?? null,
      consentimiento: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[diagnostico] insert failed:", error.message);
    return {
      status: "error",
      message: "No pudimos guardar tu diagnóstico. Intenta de nuevo o escríbenos por WhatsApp.",
    };
  }

  const toolLabels = herramientas.map((value) => labelFor(HERRAMIENTAS_OPTIONS, value));
  const notification = await sendDiagnosticoNotification({
    empresa: data.empresa,
    email,
    rows: [
      { label: "Nombre", value: data.nombre },
      { label: "Empresa", value: data.empresa },
      { label: "Cargo", value: data.cargo ?? "—" },
      { label: "WhatsApp", value: data.whatsapp },
      { label: "Email", value: email },
      { label: "Plan de interés", value: data.plan ? planName(data.plan) : "Sin elegir" },
      { label: "Ventas mensuales", value: labelFor(VENTAS_OPTIONS, data.ventas) },
      { label: "Equipo", value: labelFor(EQUIPO_OPTIONS, data.equipo) },
      { label: "Inversión mensual", value: labelFor(INVERSION_OPTIONS, data.inversion) },
      {
        label: "Herramientas",
        value: toolLabels.length ? toolLabels.join(", ") + (data.herramientasOtras ? ` (${data.herramientasOtras})` : "") : "—",
      },
      { label: "Proceso que más duele", value: data.dolor },
    ],
  });
  // The lead is already saved; a failed email must not fail the submission.
  if (!notification.ok) console.error("[diagnostico] notification failed:", notification.error);

  await logActivity({
    action: "contact_form_sent",
    resourceType: "imt_diagnosticos",
    resourceId: row?.id,
    metadata: { origen: "diagnostico", empresa: data.empresa, plan: data.plan ?? null },
  });

  const message = `Hola Alexander, acabo de registrar el diagnóstico de ${data.empresa} en IA Master Tech${
    data.plan ? ` (plan ${planName(data.plan)})` : ""
  }.`;
  return { status: "success", empresa: data.empresa, plan: data.plan ?? null, whatsappUrl: whatsappUrl(message) };
}
