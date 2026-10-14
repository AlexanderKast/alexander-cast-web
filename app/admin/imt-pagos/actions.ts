"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { logActivity } from "@/lib/admin/activity-logger";
import { requireAuth } from "@/lib/auth";
import { baseUrl } from "@/lib/comunidad/url";
import { origenPublico } from "@/lib/imt/origen";
import { reenviarAcceso } from "@/lib/imt/portal";
import { puedeGestionarConfiguracion } from "@/lib/proyectos/permisos";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reenvía el enlace mágico al portal del cliente de un pedido pagado. */
export async function reenviarAccesoPortalAdmin(formData: FormData): Promise<void> {
  const usuario = await requireAuth();
  if (!puedeGestionarConfiguracion(usuario.role)) throw new Error("Sin permiso para esta acción.");

  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) throw new Error("Pedido inválido");

  const db = createSupabaseServiceRole();
  const { data: pedido, error } = await db
    .from("imt_pedidos")
    .select("email, estado")
    .eq("id", id)
    .maybeSingle<{ email: string; estado: string }>();
  if (error) throw new Error(error.message);
  if (!pedido || pedido.estado !== "pagado") throw new Error("Solo se reenvía el acceso de pedidos pagados.");

  const enviado = await reenviarAcceso(db, pedido.email, origenPublico(await headers(), baseUrl()));
  if (!enviado) throw new Error("No se pudo enviar: ese correo no tiene un portal activo.");

  await logActivity({ userId: usuario.id, action: "imt_acceso_reenviado", resourceType: "imt_pedidos", resourceId: id });
  revalidatePath("/admin/imt-pagos");
}
