"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/admin/activity-logger";
import { requireAuth } from "@/lib/auth";
import { puedeGestionarConfiguracion } from "@/lib/proyectos/permisos";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function exigirPermiso() {
  const usuario = await requireAuth();
  // El dinero solo lo mueven founder y manager.
  if (!puedeGestionarConfiguracion(usuario.role)) throw new Error("Sin permiso para esta acción.");
  return usuario;
}

/** Marca una comisión como pagada. Solo desde 'pendiente': no se paga dos veces. */
export async function marcarComisionPagada(formData: FormData): Promise<void> {
  const usuario = await exigirPermiso();
  const id = String(formData.get("id") ?? "");
  const referencia = String(formData.get("referencia") ?? "").trim().slice(0, 200);
  if (!UUID.test(id)) throw new Error("Comisión inválida");
  if (referencia.length < 3) throw new Error("Escribe la referencia de la transferencia.");

  const { data, error } = await createSupabaseServiceRole()
    .from("imt_comisiones")
    .update({ estado: "pagada", pagada_at: new Date().toISOString(), referencia_pago: referencia })
    .eq("id", id)
    .eq("estado", "pendiente")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    await logActivity({ userId: usuario.id, action: "imt_comision_pagada", resourceType: "imt_comisiones", resourceId: id });
  }
  revalidatePath("/admin/referidos");
}

/** Anula una comisión pendiente (fraude, error, acuerdo con el referidor). */
export async function anularComision(formData: FormData): Promise<void> {
  const usuario = await exigirPermiso();
  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 500);
  if (!UUID.test(id)) throw new Error("Comisión inválida");
  if (motivo.length < 3) throw new Error("Escribe el motivo de la anulación.");

  const { data, error } = await createSupabaseServiceRole()
    .from("imt_comisiones")
    .update({ estado: "anulada", notas: motivo })
    .eq("id", id)
    .in("estado", ["pendiente", "en_revision"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    await logActivity({ userId: usuario.id, action: "imt_comision_anulada", resourceType: "imt_comisiones", resourceId: id, metadata: { motivo } });
  }
  revalidatePath("/admin/referidos");
}

/** Pausa o reactiva a un referidor. Pausado: las ventas nuevas no comisionan. */
export async function cambiarEstadoReferidor(formData: FormData): Promise<void> {
  const usuario = await exigirPermiso();
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!UUID.test(id) || (estado !== "activo" && estado !== "pausado")) throw new Error("Datos inválidos");

  const { error } = await createSupabaseServiceRole().from("imt_referidores").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity({ userId: usuario.id, action: "imt_referidor_estado", resourceType: "imt_referidores", resourceId: id, metadata: { estado } });
  revalidatePath("/admin/referidos");
}
