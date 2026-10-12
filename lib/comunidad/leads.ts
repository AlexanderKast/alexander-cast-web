import "server-only";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { PRIVACIDAD_VERSION, UTM_CAMPOS, sanearUtm } from "./consentimiento";

/**
 * Leads: solicitudes de información y lista de espera. Entidad PROPIA:
 * no es cuenta, ni pedido, ni checkout, ni reserva de cupo. Solo el servidor
 * escribe y lee (RLS sin políticas). Nunca se consulta por correo hacia afuera.
 */

export type Intencion = "informacion" | "lista_espera";

export interface NuevoLead {
  requestKey: string;
  nombre: string;
  email: string; // en minúsculas
  whatsapp?: string;
  intencion: Intencion;
  origen: "web" | "stand";
  marketing: boolean;
  /** UTM crudas del formulario: se sanean aquí. */
  utm: Record<string, unknown>;
}

/**
 * Inserta el lead. Idempotente por `request_key`: reintentar el mismo envío
 * (doble clic, reintento de red) no crea otra fila y también cuenta como éxito.
 * Devuelve true solo si la solicitud QUEDÓ persistida.
 */
export async function guardarSolicitud(l: NuevoLead): Promise<boolean> {
  const ahora = new Date().toISOString();
  const utm: Record<string, string | null> = {};
  for (const campo of UTM_CAMPOS) utm[campo] = sanearUtm(l.utm[campo]);

  const { error } = await createSupabaseServiceRole()
    .from("mia_leads")
    .insert({
      request_key: l.requestKey,
      nombre: l.nombre,
      email_normalized: l.email,
      whatsapp: l.whatsapp ?? null,
      intencion: l.intencion,
      origen: l.origen,
      ...utm,
      privacidad_aceptada_en: ahora,
      privacidad_version: PRIVACIDAD_VERSION,
      marketing_aceptado_en: l.marketing ? ahora : null,
    });

  if (!error) return true;
  if (error.code === "23505") return true; // mismo envío ya guardado
  console.error("[comunidad] no se pudo guardar el lead:", error.message);
  return false;
}

export interface FilaLead {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  intencion: Intencion;
  origen: string;
  utmCampaign: string | null;
  marketing: boolean;
  createdAt: string;
}

/** Solo admin (la página llama a requireAdminComunidad antes). */
export async function listarLeads(limite = 200): Promise<FilaLead[]> {
  const { data } = await createSupabaseServiceRole()
    .from("mia_leads")
    .select("id, nombre, email_normalized, whatsapp, intencion, origen, utm_campaign, marketing_aceptado_en, created_at")
    .order("created_at", { ascending: false })
    .limit(limite);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    nombre: r.nombre as string,
    email: r.email_normalized as string,
    whatsapp: (r.whatsapp as string | null) ?? null,
    intencion: r.intencion as Intencion,
    origen: r.origen as string,
    utmCampaign: (r.utm_campaign as string | null) ?? null,
    marketing: r.marketing_aceptado_en !== null,
    createdAt: r.created_at as string,
  }));
}
