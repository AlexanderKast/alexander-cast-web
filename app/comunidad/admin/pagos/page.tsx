import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { idsRecuperables, listarPedidos, type Pedido } from "@/lib/comunidad/pedidos";
import { formatoPesos } from "@/lib/comunidad/precio";
import { NIVELES } from "@/lib/comunidad/oferta";
import { enlaceWhatsapp } from "@/lib/comunidad/whatsapp";
import { baseUrl } from "@/lib/comunidad/url";
import { BotonReenviar } from "@/components/comunidad/AccionesAlumno";
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

export default async function PagosPage() {
  await requireAdminComunidad();
  const pedidos = await listarPedidos();
  const recuperablesIds = idsRecuperables(pedidos);
  const pagados = pedidos.filter((p) => p.estado === "pagado");
  const recuperables = pedidos.filter((p) => recuperablesIds.has(p.id));
  const aRevisar = pedidos.filter((p) => p.estado === "revision" || p.estado === "disputa" || p.motivoRevision);
  const ingresos = pagados.reduce((s, p) => s + p.montoCentavos, 0);

  const stats: [string, string | number][] = [
    ["Pagados", pagados.length],
    ["Ingresos (COP)", formatoPesos(ingresos)],
    ["Por recuperar", recuperables.length],
    ["A revisar", aRevisar.length],
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/comunidad/admin" className="mia-back">
            ← Alumnos
          </Link>
          <p className="mia-eyebrow mt-5">Admin · Master IA 360</p>
          <h1 className="mia-title mt-3">Pagos y leads</h1>
        </div>
        <Link href="/comunidad/admin/cobrar" className={botonSecundarioCls}>
          Cobrar en el stand (QR)
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="mia-card-soft !p-4 sm:!p-5">
            <dt className="mia-stat-label">{k}</dt>
            <dd className="mia-stat-value">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mia-table-wrap">
        <table className="mia-table" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th>Lead / comprador</th>
              <th>Estado</th>
              <th>Entrada</th>
              <th>Origen</th>
              <th>Sesión arranque</th>
              <th>Fecha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => {
              const recuperable = recuperablesIds.has(p.id);
              const wa = recuperable
                ? enlaceWhatsapp(
                    p.whatsapp,
                    `Hola ${p.nombre.split(" ")[0]}, soy del equipo de Master IA 360. Vi que empezaste tu inscripción y no alcanzaste a terminar el pago. Aquí puedes completarla cuando quieras: ${baseUrl()}/comunidad/unete`,
                  )
                : null;
              return (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="mia-muted text-xs">{p.email}</p>
                    {p.whatsapp ? <p className="mia-muted text-xs">{p.whatsapp}</p> : null}
                  </td>
                  <td>
                    <span className={"mia-chip " + (p.estado === "pagado" ? "mia-chip-ok" : "")}>
                      {ETIQUETA[p.estado]}
                    </span>
                    {p.motivoRevision ? <p className="mia-muted mt-1 text-xs">{p.motivoRevision}</p> : null}
                    {p.errorAprovisionamiento ? (
                      <p className="mia-error text-xs">{p.errorAprovisionamiento}</p>
                    ) : null}
                  </td>
                  <td>{NIVELES[p.nivel].nombre.split(" ·")[0]}</td>
                  <td>{p.origen === "stand" ? "Stand" : "Web"}</td>
                  <td>{p.bonusIncluido ? "Sí" : "—"}</td>
                  <td className="whitespace-nowrap text-xs">
                    {new Date(p.createdAt).toLocaleString("es-CO", {
                      timeZone: "America/Bogota",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="text-right">
                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className={botonSecundarioCls}>
                        Recuperar por WhatsApp
                      </a>
                    ) : p.estado === "pagado" && p.userId ? (
                      <BotonReenviar userId={p.userId} />
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {pedidos.length === 0 ? (
              <tr>
                <td colSpan={7} className="mia-muted py-10 text-center">
                  Aún no hay pedidos. Comparte <code>/comunidad/unete</code> o muestra el QR en el stand.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
