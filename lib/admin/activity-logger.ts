import { createSupabaseServiceRole } from "@/lib/supabase/server";

export const AC_ACTIVITY_TYPES = [
  "newsletter_subscribed",
  "lead_magnet_downloaded",
  "consultation_requested",
  "contact_form_sent",
  "lead_stage_changed",
  "lead_note_added",
  "consultation_status_changed",
  "consultation_assigned",
  "contact_read",
  "imt_comision_pagada",
  "imt_comision_anulada",
  "imt_referidor_estado",
  "imt_acceso_reenviado",
] as const;

export type AcActivityType = (typeof AC_ACTIVITY_TYPES)[number];

export interface LogActivityParams {
  action: AcActivityType;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  userId?: string | null;
}

/** Registra en admin_activity (tabla compartida con UGC). Nunca lanza. */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = createSupabaseServiceRole();
    const { error } = await supabase.from("admin_activity").insert({
      user_id: params.userId ?? null,
      action: `ac.${params.action}`, // prefijo ac. para filtrar
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      metadata: params.metadata ?? {},
    });
    if (error) console.error("[ac-activity] insert failed:", error.message);
  } catch (err) {
    console.error("[ac-activity] exception:", err);
  }
}
