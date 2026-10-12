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
      <Link href="/comunidad/admin" className="mia-back">
        ← Alumnos
      </Link>
      <p className="mia-eyebrow mt-6">Lote</p>
      <h1 className="mia-title mt-3">Importar alumnos</h1>
      <p className="mia-lead mt-3">
        Sube un CSV (coma o punto y coma) con las columnas <strong>nombre</strong>,{" "}
        <strong>correo</strong> y <strong>entrada</strong> (Regular, Preventa o VIP); opcionales:{" "}
        <strong>whatsapp</strong> y <strong>cohorte</strong>. Máximo 500 filas. Importar no envía
        correos: usa «Enviar acceso a pendientes» en la lista.
      </p>
      <div className="mia-card mt-8">
        <FormImportar cohortes={cohortes.map((c) => ({ id: c.id, nombre: c.nombre }))} />
      </div>
    </div>
  );
}
