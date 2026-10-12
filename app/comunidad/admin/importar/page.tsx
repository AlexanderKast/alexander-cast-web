import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { listarCohortes } from "@/lib/comunidad/queries";
import { FormImportar } from "@/components/comunidad/FormImportar";

/** Importar hasta 500 alumnos crea un usuario por fila: damos margen. */
export const maxDuration = 120;

export default async function ImportarPage() {
  await requireAdminComunidad();
  const cohortes = (await listarCohortes()).filter((c) => c.activa);

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/comunidad/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Alumnos
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold">Importar alumnos</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sube un CSV (coma o punto y coma) con las columnas{" "}
        <code className="rounded bg-surface-2 px-1">nombre</code>,{" "}
        <code className="rounded bg-surface-2 px-1">correo</code>,{" "}
        <code className="rounded bg-surface-2 px-1">entrada</code> (Regular, Preventa o VIP) y,
        opcionales, <code className="rounded bg-surface-2 px-1">whatsapp</code> y{" "}
        <code className="rounded bg-surface-2 px-1">cohorte</code>. Máximo 500 filas. Importar no
        envía correos: usa «Enviar acceso a pendientes» en la lista.
      </p>
      <div className="mt-6">
        <FormImportar cohortes={cohortes.map((c) => ({ id: c.id, nombre: c.nombre }))} />
      </div>
    </div>
  );
}
