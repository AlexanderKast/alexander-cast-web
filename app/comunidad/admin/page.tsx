import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { listarAlumnos } from "@/lib/comunidad/queries";
import { ENTRADA_LABEL } from "@/lib/comunidad/validators";
import { BotonEnviarPendientes, BotonReenviar } from "@/components/comunidad/AccionesAlumno";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";

export default async function AdminComunidadPage() {
  await requireAdminComunidad();
  const alumnos = await listarAlumnos();

  const inscritos = alumnos.filter((a) => a.entrada !== null);
  const conFicha = inscritos.filter((a) => a.fichaCompleta).length;
  const entraron = inscritos.filter((a) => a.privacidad).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mia-eyebrow">Admin · Master IA 360</p>
          <h1 className="mia-title mt-3">Alumnos</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/comunidad/admin/nuevo" className={botonCls}>
            + Alta rápida
          </Link>
          <Link href="/comunidad/admin/importar" className={botonSecundarioCls}>
            Importar CSV
          </Link>
          <a href="/comunidad/admin/exportar" className={botonSecundarioCls}>
            Exportar CSV
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Inscritos", inscritos.length],
          ["Ya entraron", entraron],
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
              <th>Alumno</th>
              <th>Entrada</th>
              <th>Cohorte</th>
              <th>Entró</th>
              <th>Ficha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a) => (
              <tr key={a.userId}>
                <td>
                  <p className="font-medium">{a.nombre}</p>
                  <p className="mia-muted text-xs">{a.email}</p>
                  {a.whatsapp ? <p className="mia-muted text-xs">{a.whatsapp}</p> : null}
                </td>
                <td>{a.entrada ? ENTRADA_LABEL[a.entrada] : "—"}</td>
                <td>{a.cohorte ?? "—"}</td>
                <td>{a.privacidad ? "Sí" : "No"}</td>
                <td>
                  {a.entrada ? (
                    a.fichaCompleta ? (
                      <span className="mia-chip mia-chip-ok">Llenada</span>
                    ) : (
                      <span className="mia-chip">Pendiente</span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-right">
                  <BotonReenviar userId={a.userId} />
                </td>
              </tr>
            ))}
            {alumnos.length === 0 ? (
              <tr>
                <td colSpan={6} className="mia-muted py-10 text-center">
                  Aún no hay alumnos. Empieza con una alta rápida.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
