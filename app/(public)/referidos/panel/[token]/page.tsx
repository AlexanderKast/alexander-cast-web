import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CopiarEnlace } from "@/components/imt/pagos/CopiarEnlace";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { formatCop, planName, isPlanId } from "@/content/imt";
import { baseUrl } from "@/lib/comunidad/url";
import { origenPublico } from "@/lib/imt/origen";
import { esTokenPanel } from "@/lib/imt/pagos";
import { cargarPanel } from "@/lib/imt/referidos";
import { buildMetadata } from "@/lib/seo";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Tu panel de referidos",
    description: "Seguimiento privado de tus referidos y comisiones.",
    path: "/referidos/panel",
    noindex: true,
  }),
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const ESTADO_COMISION: Record<string, string> = {
  pendiente: "Pendiente de pago",
  pagada: "Pagada",
  anulada: "Anulada",
  en_revision: "En revisión",
};

const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

export default async function PanelReferidorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!esTokenPanel(token)) notFound();

  const panel = await cargarPanel(createSupabaseServiceRole(), token, origenPublico(await headers(), baseUrl()));
  if (!panel) notFound();

  const { referidor, enlace, totales, filas } = panel;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-20 pt-28 sm:px-6 sm:pt-36 lg:px-8">
      <Eyebrow>IA Master Tech · Referidos</Eyebrow>
      <h1 className="mt-4 text-balance text-3xl font-bold sm:text-4xl">Hola, {referidor.nombre.split(" ")[0]}.</h1>
      {referidor.estado !== "activo" ? (
        <p className="mt-3 rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
          Tu cuenta está pausada: las ventas nuevas no generan comisión. Escríbenos si es un error.
        </p>
      ) : null}

      <div className="imt-card mt-8 p-5 sm:p-6">
        <p className="text-sm text-imt-muted">Tu enlace personal</p>
        <CopiarEnlace enlace={enlace} />
        <p className="mt-2 text-xs text-imt-muted">
          Tu código es <span className="font-imt-mono text-imt-text">{referidor.codigo}</span>. También sirve añadir
          ?ref={referidor.codigo} a cualquier página del sitio.
        </p>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Ventas pagadas", String(totales.ventas)],
          ["Por cobrar", `${formatCop(totales.pendienteCop)} COP`],
          ["Ya pagado", `${formatCop(totales.pagadoCop)} COP`],
        ].map(([k, v]) => (
          <div key={k} className="imt-card p-5">
            <dt className="text-sm text-imt-muted">{k}</dt>
            <dd className="mt-1 font-imt-display text-2xl font-bold tabular-nums text-imt-text">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 font-imt-display text-xl font-bold">Tus referidos</h2>
      {filas.length === 0 ? (
        <p className="mt-3 text-imt-muted">Aún no hay ventas desde tu enlace. Cuando una empresa pague, aparecerá aquí.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-imt-border">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-imt-surface text-imt-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Comisión</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={`${f.fecha}-${i}`} className="border-t border-imt-border">
                  <td className="px-4 py-3">{fecha.format(new Date(f.fecha))}</td>
                  <td className="px-4 py-3">
                    {isPlanId(f.plan) ? planName(f.plan) : f.plan} · {f.periodo}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{f.comisionCop ? `${formatCop(f.comisionCop)} COP` : "—"}</td>
                  <td className="px-4 py-3">
                    {f.estadoPedido === "reembolsado"
                      ? "Cliente reembolsado"
                      : f.comisionEstado
                        ? (ESTADO_COMISION[f.comisionEstado] ?? f.comisionEstado)
                        : "Sin comisión"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-xs text-imt-muted">
        Este enlace es privado: quien lo tenga puede ver tu panel. Los pagos se coordinan por WhatsApp.
      </p>
    </section>
  );
}
