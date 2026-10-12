import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { listarCohortes } from "@/lib/comunidad/queries";
import { FormAlumno } from "@/components/comunidad/FormAlumno";

export default async function NuevoAlumnoPage() {
  await requireAdminComunidad();
  const cohortes = (await listarCohortes()).filter((c) => c.activa);

  return (
    <div className="mx-auto max-w-md">
      <Link href="/comunidad/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Alumnos
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold">Alta rápida</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Un alumno por vez. Al guardar, el formulario queda listo para el siguiente.
      </p>
      <div className="mt-6">
        {cohortes.length ? (
          <FormAlumno cohortes={cohortes.map((c) => ({ id: c.id, nombre: c.nombre }))} />
        ) : (
          <p className="text-destructive">No hay cohortes activas. Crea una primero.</p>
        )}
      </div>
    </div>
  );
}
