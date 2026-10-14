import { requireAuth } from "@/lib/auth";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  "ac.newsletter_subscribed": "Nuevo suscriptor",
  "ac.lead_magnet_downloaded": "Descarga de lead magnet",
  "ac.consultation_requested": "Solicitud de consultoría",
  "ac.contact_form_sent": "Mensaje de contacto",
  "ac.lead_stage_changed": "Cambio de etapa lead",
  "ac.lead_note_added": "Nota en lead",
  "ac.consultation_status_changed": "Cambio estado consultoría",
  "ac.consultation_assigned": "Consultoría asignada",
  "ac.contact_read": "Mensaje leído",
  "ac.imt_comision_pagada": "Comisión de referido pagada",
  "ac.imt_comision_anulada": "Comisión de referido anulada",
  "ac.imt_referidor_estado": "Referidor pausado/reactivado",
  "ac.imt_acceso_reenviado": "Acceso al portal reenviado",
};

export default async function ActividadPage() {
  await requireAuth();
  const supabase = createSupabaseServiceRole();
  const { data } = await supabase
    .from("admin_activity")
    .select("id, action, resource_type, resource_id, metadata, created_at, admin_users(full_name, email)")
    .like("action", "ac.%")
    .order("created_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    admin_users: { full_name: string | null; email: string } | null;
  };
  const raw = (data ?? []) as unknown as Array<Omit<Row, "admin_users"> & {
    admin_users: Row["admin_users"] | Array<NonNullable<Row["admin_users"]>>;
  }>;
  const rows: Row[] = raw.map((r) => ({
    ...r,
    admin_users: Array.isArray(r.admin_users) ? (r.admin_users[0] ?? null) : r.admin_users,
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Audit log</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
          Actividad reciente
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Últimas 100 acciones del sitio. Audit log inmutable compartido.
        </p>
      </header>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-1)] p-4"
          >
            <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-[color:var(--gold-mid)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white">
                <span className="font-semibold">
                  {r.admin_users?.full_name ?? r.admin_users?.email ?? "Sistema"}
                </span>{" "}
                <span className="text-white/60">
                  · {ACTION_LABEL[r.action] ?? r.action}
                </span>
              </p>
              {r.resource_type ? (
                <p className="mt-1 text-xs text-white/40">
                  {r.resource_type}
                  {r.resource_id ? ` · ${r.resource_id.slice(0, 8)}` : ""}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 text-[11px] text-white/40">
              {new Date(r.created_at).toLocaleString("es-CO")}
            </span>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[color:var(--line)] p-10 text-center text-sm text-white/40">
            No hay actividad aún.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
