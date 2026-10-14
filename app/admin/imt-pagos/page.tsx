import { redirect } from "next/navigation";
import { formatCop } from "@/content/imt";
import { requireAuth } from "@/lib/auth";
import { puedeGestionarConfiguracion } from "@/lib/proyectos/permisos";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Pedido = {
  id: string;
  created_at: string;
  plan: string;
  periodo: string;
  importe_cop: number;
  estado: string;
  suscripcion_estado: string | null;
  nombre: string;
  empresa: string;
  email: string;
  whatsapp: string;
  ref_codigo: string | null;
  pagado_at: string | null;
  minimo_hasta: string | null;
  stripe_session_id: string | null;
};

type EventoError = { id: string; created_at: string; tipo: string; error: string | null };

const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

export default async function PagosImtPage() {
  const usuario = await requireAuth();
  if (!puedeGestionarConfiguracion(usuario.role)) redirect("/admin");

  const db = createSupabaseServiceRole();
  const [{ data: pedidos, error }, { data: errores }, { data: cobros }] = await Promise.all([
    db
      .from("imt_pedidos")
      .select(
        "id, created_at, plan, periodo, importe_cop, estado, suscripcion_estado, nombre, empresa, email, whatsapp, ref_codigo, pagado_at, minimo_hasta, stripe_session_id",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("imt_eventos_stripe").select("id, created_at, tipo, error").eq("estado", "error").order("created_at", { ascending: false }).limit(20),
    db.from("imt_cobros").select("monto_cop"),
  ]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-300">
        Error al leer pedidos: {error.message}. ¿Ya se aplicó la migración 0025?
      </div>
    );
  }

  const lista = (pedidos ?? []) as Pedido[];
  const fallidos = (errores ?? []) as EventoError[];
  const pagados = lista.filter((p) => p.estado === "pagado");
  const cobrado = ((cobros ?? []) as { monto_cop: number }[]).reduce((s, c) => s + c.monto_cop, 0);
  const activas = pagados.filter((p) => p.periodo === "mensual" && p.suscripcion_estado === "activa");
  const mrr = activas.reduce((s, p) => s + p.importe_cop, 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">IA Master Tech</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">Pagos de planes</h1>
        <p className="mt-2 text-sm text-white/55">
          Cobrado {formatCop(cobrado)} COP · {pagados.length} pagados · {activas.length} suscripciones activas ({formatCop(mrr)} COP/mes)
        </p>
      </header>

      {fallidos.length > 0 ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
          <p className="font-medium">{fallidos.length} evento(s) de Stripe con error. Stripe los reintenta; si persisten, revisa:</p>
          <ul className="mt-2 space-y-1 text-xs">
            {fallidos.map((e) => (
              <li key={e.id}>
                {fecha.format(new Date(e.created_at))} · {e.tipo} · {e.error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[60rem] text-left text-sm text-white/80">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Importe</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Contrato mínimo</th>
              <th className="px-3 py-2">Referido</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-t border-white/10 align-top">
                <td className="px-3 py-2">{fecha.format(new Date(p.created_at))}</td>
                <td className="px-3 py-2">
                  {p.empresa}
                  <div className="text-xs text-white/40">
                    {p.nombre} · {p.email} · {p.whatsapp}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {p.plan} · {p.periodo}
                </td>
                <td className="px-3 py-2 tabular-nums">{formatCop(p.importe_cop)}</td>
                <td className="px-3 py-2">
                  {p.estado}
                  {p.suscripcion_estado ? <div className="text-xs text-white/40">suscripción {p.suscripcion_estado}</div> : null}
                </td>
                <td className="px-3 py-2">{p.minimo_hasta ? `hasta ${fecha.format(new Date(p.minimo_hasta))}` : "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.ref_codigo ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
