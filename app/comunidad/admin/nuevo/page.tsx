import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { listarOfertasParaAlta } from "@/lib/comunidad/queries";
import { FormAlumno } from "@/components/comunidad/FormAlumno";

export default async function NuevoAlumnoPage() {
  await requireAdminComunidad();
  const ofertas = await listarOfertasParaAlta();

  return (
    <div className="mx-auto max-w-md">
      <Link href="/comunidad/admin" className="mia-back">
        ← Cuentas
      </Link>
      <p className="mia-eyebrow mt-6">Alta manual</p>
      <h1 className="mia-title mt-3">Dar acceso a una persona</h1>
      <p className="mia-lead mt-3">
        Concede un derecho de acceso (no es una venta) y deja constancia de quién lo hizo y por qué. Para cobrar, la
        persona crea su cuenta y compra dentro de la plataforma.
      </p>
      <div className="mia-card mt-8">
        {ofertas.length ? (
          <FormAlumno
            ofertas={ofertas.map((o) => ({
              id: o.id,
              etiqueta: `${o.productoNombre} · ${o.nombre}${o.cohorteNombre ? ` (${o.cohorteNombre})` : ""}`,
            }))}
          />
        ) : (
          <p className="mia-error">No hay ofertas activas en programas publicados.</p>
        )}
      </div>
    </div>
  );
}
