import { redirect } from "next/navigation";
import { formatCop } from "@/content/imt";
import { requireAuth } from "@/lib/auth";
import { puedeGestionarConfiguracion } from "@/lib/proyectos/permisos";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { anularComision, cambiarEstadoReferidor, marcarComisionPagada } from "./actions";

export const dynamic = "force-dynamic";

type Comision = {
  id: string;
  created_at: string;
  base_cop: number;
  porcentaje: number;
  monto_cop: number;
  estado: string;
  pagada_at: string | null;
  referencia_pago: string | null;
  notas: string | null;
  imt_referidores: { nombre: string; whatsapp: string; codigo: string } | null;
  imt_pedidos: { empresa: string; plan: string; periodo: string } | null;
};

type Referidor = {
  id: string;
  created_at: string;
  codigo: string;
  nombre: string;
  email: string;
  whatsapp: string;
  estado: string;
};

const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });
const input = "rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/30";
const boton = "rounded-lg border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10";

export default async function ReferidosAdminPage() {
  const usuario = await requireAuth();
  if (!puedeGestionarConfiguracion(usuario.role)) redirect("/admin");

  const db = createSupabaseServiceRole();
  const [{ data: comisiones, error: e1 }, { data: referidores, error: e2 }] = await Promise.all([
    db
      .from("imt_comisiones")
      .select(
        "id, created_at, base_cop, porcentaje, monto_cop, estado, pagada_at, referencia_pago, notas, imt_referidores(nombre, whatsapp, codigo), imt_pedidos(empresa, plan, periodo)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("imt_referidores").select("id, created_at, codigo, nombre, email, whatsapp, estado").order("created_at", { ascending: false }).limit(200),
  ]);

  if (e1 || e2) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-300">
        Error al leer referidos: {(e1 ?? e2)?.message}. ¿Ya se aplicó la migración 0025?
      </div>
    );
  }

  const lista = (comisiones ?? []) as unknown as Comision[];
  const refs = (referidores ?? []) as Referidor[];
  const suma = (estado: string) => lista.filter((c) => c.estado === estado).reduce((s, c) => s + c.monto_cop, 0);

  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">IA Master Tech</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">Referidos y comisiones</h1>
        <p className="mt-2 text-sm text-white/55">
          Por pagar {formatCop(suma("pendiente"))} COP · Pagado {formatCop(suma("pagada"))} COP · {refs.length} referidores
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Comisiones</h2>
        {lista.length === 0 ? (
          <p className="text-sm text-white/55">Todavía no hay comisiones.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[56rem] text-left text-sm text-white/80">
              <thead className="bg-white/5 text-white/50">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Referidor</th>
                  <th className="px-3 py-2">Venta</th>
                  <th className="px-3 py-2">Comisión</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-t border-white/10 align-top">
                    <td className="px-3 py-2">{fecha.format(new Date(c.created_at))}</td>
                    <td className="px-3 py-2">
                      {c.imt_referidores?.nombre ?? "—"}
                      <div className="text-xs text-white/40">
                        {c.imt_referidores?.codigo} · {c.imt_referidores?.whatsapp}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {c.imt_pedidos?.empresa ?? "—"}
                      <div className="text-xs text-white/40">
                        {c.imt_pedidos?.plan} · {c.imt_pedidos?.periodo} · base {formatCop(c.base_cop)}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatCop(c.monto_cop)} <span className="text-xs text-white/40">({c.porcentaje}%)</span>
                    </td>
                    <td className="px-3 py-2">
                      {c.estado}
                      {c.pagada_at ? <div className="text-xs text-white/40">{fecha.format(new Date(c.pagada_at))} · {c.referencia_pago}</div> : null}
                      {c.notas ? <div className="text-xs text-amber-300/80">{c.notas}</div> : null}
                    </td>
                    <td className="px-3 py-2">
                      {c.estado === "pendiente" ? (
                        <div className="flex flex-col gap-2">
                          <form action={marcarComisionPagada} className="flex gap-2">
                            <input type="hidden" name="id" value={c.id} />
                            <input name="referencia" required minLength={3} placeholder="Ref. transferencia" className={input} />
                            <button type="submit" className={boton}>Marcar pagada</button>
                          </form>
                          <form action={anularComision} className="flex gap-2">
                            <input type="hidden" name="id" value={c.id} />
                            <input name="motivo" required minLength={3} placeholder="Motivo" className={input} />
                            <button type="submit" className={boton}>Anular</button>
                          </form>
                        </div>
                      ) : c.estado === "en_revision" ? (
                        <form action={anularComision} className="flex gap-2">
                          <input type="hidden" name="id" value={c.id} />
                          <input name="motivo" required minLength={3} placeholder="Cómo se resolvió" className={input} />
                          <button type="submit" className={boton}>Cerrar</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Referidores</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[44rem] text-left text-sm text-white/80">
            <thead className="bg-white/5 text-white/50">
              <tr>
                <th className="px-3 py-2">Alta</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Contacto</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {refs.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{fecha.format(new Date(r.created_at))}</td>
                  <td className="px-3 py-2">{r.nombre}</td>
                  <td className="px-3 py-2">
                    {r.email}
                    <div className="text-xs text-white/40">{r.whatsapp}</div>
                  </td>
                  <td className="px-3 py-2 font-mono">{r.codigo}</td>
                  <td className="px-3 py-2">
                    <form action={cambiarEstadoReferidor} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="estado" value={r.estado === "activo" ? "pausado" : "activo"} />
                      <span>{r.estado}</span>
                      <button type="submit" className={boton}>{r.estado === "activo" ? "Pausar" : "Reactivar"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
