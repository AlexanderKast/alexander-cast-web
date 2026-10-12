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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Alumnos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Master IA 360 · Fase 0</p>
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
          <div key={k} className="rounded-2xl border border-line-strong bg-surface-1 p-4">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-2xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <BotonEnviarPendientes />

      <div className="overflow-x-auto rounded-2xl border border-line-strong">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Alumno</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Cohorte</th>
              <th className="px-4 py-3">Entró</th>
              <th className="px-4 py-3">Ficha</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {alumnos.map((a) => (
              <tr key={a.userId} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{a.nombre}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                  {a.whatsapp ? <p className="text-xs text-muted-foreground">{a.whatsapp}</p> : null}
                </td>
                <td className="px-4 py-3">{a.entrada ? ENTRADA_LABEL[a.entrada] : "—"}</td>
                <td className="px-4 py-3">{a.cohorte ?? "—"}</td>
                <td className="px-4 py-3">{a.privacidad ? "Sí" : "No"}</td>
                <td className="px-4 py-3">
                  {a.entrada ? (
                    a.fichaCompleta ? (
                      <span className="text-gold">Llenada</span>
                    ) : (
                      <span className="text-muted-foreground">Pendiente</span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <BotonReenviar userId={a.userId} />
                </td>
              </tr>
            ))}
            {alumnos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
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
