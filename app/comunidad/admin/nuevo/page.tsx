import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { listarCohortes } from "@/lib/comunidad/queries";
import { FormAlumno } from "@/components/comunidad/FormAlumno";

export default async function NuevoAlumnoPage() {
  await requireAdminComunidad();
  const cohortes = (await listarCohortes()).filter((c) => c.activa);

  return (
    <div className="mx-auto max-w-md">
      <Link href="/comunidad/admin" className="mia-back">
        ← Alumnos
      </Link>
      <p className="mia-eyebrow mt-6">Stand · Feria Effix</p>
      <h1 className="mia-title mt-3">Alta rápida</h1>
      <p className="mia-lead mt-3">
        Un alumno por vez. Al guardar, el formulario queda listo para el siguiente.
      </p>
      <div className="mia-card mt-8">
        {cohortes.length ? (
          <FormAlumno cohortes={cohortes.map((c) => ({ id: c.id, nombre: c.nombre }))} />
        ) : (
          <p className="mia-error">No hay cohortes activas. Crea una primero.</p>
        )}
      </div>
    </div>
  );
}
