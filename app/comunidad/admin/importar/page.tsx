import Link from "next/link";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { listarOfertasParaAlta } from "@/lib/comunidad/queries";
import { FormImportar } from "@/components/comunidad/FormImportar";

/** Importar hasta 500 cuentas crea un usuario por fila: damos margen. */
export const maxDuration = 120;

export default async function ImportarPage() {
  await requireAdminComunidad();
  const ofertas = await listarOfertasParaAlta();
  const productos = [...new Map(ofertas.map((o) => [o.productoId, { id: o.productoId, nombre: o.productoNombre }])).values()];

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/comunidad/admin" className="mia-back">
        ← Cuentas
      </Link>
      <p className="mia-eyebrow mt-6">Lote</p>
      <h1 className="mia-title mt-3">Importar cuentas con acceso</h1>
      <p className="mia-lead mt-3">
        Sube un CSV (coma o punto y coma) con <strong>nombre</strong>, <strong>correo</strong> y{" "}
        <strong>entrada</strong> (el nombre corto de la oferta: por ejemplo preventa, regular o vip); opcional:{" "}
        <strong>whatsapp</strong>. Máximo 500 filas. Cada alta queda registrada con tu usuario y la fecha como motivo.
        Importar no envía correos: usa «Enviar acceso a pendientes» en la lista.
      </p>
      <div className="mia-card mt-8">
        {productos.length ? <FormImportar productos={productos} /> : <p className="mia-error">No hay programas con ofertas activas.</p>}
      </div>
    </div>
  );
}
