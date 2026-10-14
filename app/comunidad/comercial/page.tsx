import Link from "next/link";
import { requireComercial } from "@/lib/comunidad/auth";
import { listarOportunidades } from "@/lib/comunidad/oportunidades";
import { ABIERTAS, ETIQUETA_ESTADO } from "@/lib/comunidad/oportunidades-reglas";

export const dynamic = "force-dynamic";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });

export default async function ComercialPage() {
  const m = await requireComercial();
  const oportunidades = await listarOportunidades({ userId: m.userId, rol: m.rol });
  const abiertas = oportunidades.filter((o) => ABIERTAS.includes(o.estado));
  const ganadas = oportunidades.filter((o) => o.estado === "ganada").length;
  const sinAsignar = abiertas.filter((o) => !o.asignadoA).length;

  const stats: [string, number][] = [
    ["Abiertas", abiertas.length],
    ["Sin asignar", sinAsignar],
    ["Ganadas", ganadas],
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="mia-eyebrow">Venta asistida</p>
        <h1 className="mia-title mt-3">Oportunidades</h1>
        <p className="mia-lead mt-3">
          {m.rol === "admin"
            ? "Todas las personas que pidieron un asesor."
            : "Las personas que te asignaron. Ves solo lo tuyo."}{" "}
          Una oportunidad queda ganada únicamente cuando el pago del pedido se confirma.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {stats.map(([k, v]) => (
          <div key={k} className="mia-card-soft !p-4">
            <dt className="mia-stat-label">{k}</dt>
            <dd className="mia-stat-value !text-xl sm:!text-2xl">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mia-table-wrap">
        <table className="mia-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Programa · oferta</th>
              <th>Estado</th>
              <th>Asignada a</th>
              <th>Fecha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {oportunidades.map((o) => (
              <tr key={o.id}>
                <td>
                  <p className="font-medium">{o.clienteNombre}</p>
                  <p className="mia-muted text-xs">{o.clienteEmail}</p>
                </td>
                <td>
                  <p>{o.productoNombre}</p>
                  <p className="mia-muted text-xs">{o.ofertaNombre ?? "Sin oferta elegida"}</p>
                </td>
                <td>
                  <span className={"mia-chip " + (o.estado === "ganada" ? "mia-chip-ok" : "")}>{ETIQUETA_ESTADO[o.estado]}</span>
                </td>
                <td className="text-sm">{o.asignadoNombre ?? <span className="mia-muted">Sin asignar</span>}</td>
                <td className="whitespace-nowrap text-xs">{fecha(o.createdAt)}</td>
                <td className="text-right">
                  <Link href={`/comunidad/comercial/${o.id}`} className="mia-btn mia-btn-secondary mia-btn-sm">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {oportunidades.length === 0 ? (
              <tr>
                <td colSpan={6} className="mia-muted py-10 text-center">
                  No hay oportunidades por ahora.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
