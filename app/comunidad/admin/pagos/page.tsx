import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { idsRecuperables, listarPedidos, type Pedido } from "@/lib/comunidad/pedidos";
import { listarLeads } from "@/lib/comunidad/leads";
import { formatoMoneda } from "@/lib/comunidad/precio";
import { enlaceWhatsapp } from "@/lib/comunidad/whatsapp";
import { baseUrl } from "@/lib/comunidad/url";
import { botonSecundarioCls } from "@/components/comunidad/ui";

export const dynamic = "force-dynamic";

const ETIQUETA: Record<Pedido["estado"], string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  fallido: "Fallido",
  abandonado: "Abandonado",
  reembolsado: "Reembolsado",
  disputa: "Disputa",
  revision: "Revisar",
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

export default async function PagosPage() {
  await requireAdminComunidad();
  const [pedidos, leads] = await Promise.all([listarPedidos(), listarLeads()]);

  const recuperables = idsRecuperables(pedidos);
  const pagados = pedidos.filter((p) => p.estado === "pagado");
  const aRevisar = pedidos.filter((p) => p.estado === "revision" || p.estado === "disputa" || p.motivoRevision);

  // Ingresos por moneda: nunca se suman monedas distintas entre sí.
  const ingresos = new Map<string, number>();
  for (const p of pagados) ingresos.set(p.moneda, (ingresos.get(p.moneda) ?? 0) + p.montoCentavos);
  const textoIngresos = [...ingresos].map(([m, c]) => `${formatoMoneda(c, m)} ${m.toUpperCase()}`).join(" · ") || "—";

  const stats: [string, string | number][] = [
    ["Pagados", pagados.length],
    ["Ingresos", textoIngresos],
    ["Por recuperar", recuperables.size],
    ["A revisar", aRevisar.length],
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/comunidad/admin" className="mia-back">
            ← Cuentas
          </Link>
          <p className="mia-eyebrow mt-5">Admin · Plataforma de programas</p>
          <h1 className="mia-title mt-3">Pagos y lista de espera</h1>
        </div>
        <Link href="/comunidad/admin/cobrar" className={botonSecundarioCls}>
          Cobrar en el stand (QR)
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="mia-card-soft !p-4 sm:!p-5">
            <dt className="mia-stat-label">{k}</dt>
            <dd className="mia-stat-value !text-xl sm:!text-2xl">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="pedidos">
        <h2 id="pedidos" className="text-lg font-semibold">
          Pedidos
        </h2>
        <div className="mia-table-wrap mt-3">
          <table className="mia-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Programa · oferta</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Fecha</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const wa = recuperables.has(p.id)
                  ? enlaceWhatsapp(
                      p.whatsapp,
                      `Hola ${p.nombre.split(" ")[0]}, soy del equipo de la plataforma. Vi que empezaste una compra y no alcanzaste a terminar el pago. Puedes retomarla entrando a tu cuenta: ${baseUrl()}/comunidad/pedidos/${p.id}`,
                    )
                  : null;
                return (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium">{p.nombre}</p>
                      <p className="mia-muted text-xs">{p.email}</p>
                      {p.historico ? <span className="mia-chip mt-1">Compra invitada anterior</span> : null}
                    </td>
                    <td>
                      <p>{p.snapshot?.producto?.nombre ?? "Master IA 360"}</p>
                      <p className="mia-muted text-xs">{p.snapshot?.oferta?.nombre ?? p.nivel}</p>
                    </td>
                    <td className="whitespace-nowrap">{formatoMoneda(p.montoCentavos, p.moneda)}</td>
                    <td>
                      <span className={"mia-chip " + (p.estado === "pagado" ? "mia-chip-ok" : "")}>{ETIQUETA[p.estado]}</span>
                      {p.motivoRevision ? <p className="mia-muted mt-1 text-xs">{p.motivoRevision}</p> : null}
                      {p.errorAprovisionamiento ? <p className="mia-error text-xs">{p.errorAprovisionamiento}</p> : null}
                    </td>
                    <td className="text-xs">{p.creadoPor ? "Asesor" : p.origen === "stand" ? "Stand" : "Web"}</td>
                    <td className="whitespace-nowrap text-xs">{fecha(p.createdAt)}</td>
                    <td className="text-right">
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className={botonSecundarioCls}>
                          Recuperar por WhatsApp
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="mia-muted py-10 text-center">
                    Aún no hay pedidos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="leads">
        <h2 id="leads" className="text-lg font-semibold">
          Lista de espera
        </h2>
        <p className="mia-muted mt-1 text-sm">
          Personas que dejaron sus datos sin crear cuenta (ventas cerradas o sin cupos). No son reservas ni compras.
        </p>
        <div className="mia-table-wrap mt-3">
          <table className="mia-table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Intención</th>
                <th>Origen</th>
                <th>Promociones</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <p className="font-medium">{l.nombre}</p>
                    <p className="mia-muted text-xs">{l.email}</p>
                    {l.whatsapp ? <p className="mia-muted text-xs">{l.whatsapp}</p> : null}
                  </td>
                  <td>{l.intencion === "lista_espera" ? "Lista de espera" : "Información"}</td>
                  <td className="text-xs">
                    {l.origen === "stand" ? "Stand" : "Web"}
                    {l.utmCampaign ? ` · ${l.utmCampaign}` : ""}
                  </td>
                  <td>{l.marketing ? "Autorizó" : "No"}</td>
                  <td className="whitespace-nowrap text-xs">{fecha(l.createdAt)}</td>
                </tr>
              ))}
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="mia-muted py-8 text-center">
                    Nadie en la lista de espera.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
