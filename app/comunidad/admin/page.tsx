import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { listarAlumnos } from "@/lib/comunidad/queries";
import { BotonEnviarPendientes, BotonReenviar } from "@/components/comunidad/AccionesAlumno";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";

export default async function AdminComunidadPage() {
  await requireAdminComunidad();
  const cuentas = await listarAlumnos();

  const conPrograma = cuentas.filter((a) => a.programas.some((p) => p.estado === "activa"));
  const conFicha = conPrograma.filter((a) => a.fichaCompleta).length;
  const entraron = cuentas.filter((a) => a.privacidad).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mia-eyebrow">Admin · Plataforma de programas</p>
          <h1 className="mia-title mt-3">Cuentas</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/comunidad/admin/nuevo" className={botonCls}>
            + Alta manual
          </Link>
          <Link href="/comunidad/admin/pagos" className={botonSecundarioCls}>
            Pagos y leads
          </Link>
          <Link href="/comunidad/comercial" className={botonSecundarioCls}>
            Venta asistida
          </Link>
          <Link href="/comunidad/admin/importar" className={botonSecundarioCls}>
            Importar CSV
          </Link>
          <a href="/comunidad/admin/exportar" className={botonSecundarioCls}>
            Exportar CSV
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Cuentas", cuentas.length],
          ["Con programa", conPrograma.length],
          ["Aceptaron datos", entraron],
          ["Con ficha", conFicha],
        ].map(([k, v]) => (
          <div key={k} className="mia-card-soft !p-4 sm:!p-5">
            <dt className="mia-stat-label">{k}</dt>
            <dd className="mia-stat-value">{v}</dd>
          </div>
        ))}
      </dl>

      <BotonEnviarPendientes />

      <div className="mia-table-wrap">
        <table className="mia-table">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Rol</th>
              <th>Programas</th>
              <th>Datos</th>
              <th>Ficha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cuentas.map((a) => (
              <tr key={a.userId}>
                <td>
                  <p className="font-medium">{a.nombre}</p>
                  <p className="mia-muted text-xs">{a.email}</p>
                  {a.whatsapp ? <p className="mia-muted text-xs">{a.whatsapp}</p> : null}
                </td>
                <td>{a.rol}</td>
                <td>
                  {a.programas.length ? (
                    <div className="flex flex-wrap gap-1">
                      {a.programas.map((p, i) => (
                        <span key={i} className={"mia-chip " + (p.estado === "activa" ? "mia-chip-ok" : "")}>
                          {p.producto} · {p.oferta}
                          {p.estado !== "activa" ? " (revocado)" : ""}
                          {p.origen !== "pago" ? ` · ${p.origen}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="mia-muted">Sin programas</span>
                  )}
                </td>
                <td>{a.privacidad ? "Aceptados" : "Pendiente"}</td>
                <td>
                  {a.programas.length ? (
                    a.fichaCompleta ? <span className="mia-chip mia-chip-ok">Llenada</span> : <span className="mia-chip">Pendiente</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-right">
                  <BotonReenviar userId={a.userId} />
                </td>
              </tr>
            ))}
            {cuentas.length === 0 ? (
              <tr>
                <td colSpan={6} className="mia-muted py-10 text-center">
                  Aún no hay cuentas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
