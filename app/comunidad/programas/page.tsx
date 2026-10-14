import type { Metadata } from "next";
import Link from "next/link";
import { requireMiembro } from "@/lib/comunidad/auth";
import { listarProductosPublicados, type Producto } from "@/lib/comunidad/catalogo";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";

export const metadata: Metadata = {
  title: "Programas · Plataforma",
  robots: { index: false, follow: false },
};

/**
 * Catálogo de programas. Es privado pero NO exige haber comprado nada: cualquier cuenta verificada lo explora.
 * Solo se listan los programas publicados; el catálogo es extensible (hoy el único es Master IA 360).
 */
export default async function ProgramasPage() {
  const m = await requireMiembro();

  let productos: Producto[] = [];
  let error = false;
  try {
    productos = await listarProductosPublicados();
  } catch {
    error = true;
  }
  const mios = new Set(m.derechos.map((d) => d.productoSlug));

  return (
    <div className="space-y-8">
      <div>
        <p className="mia-eyebrow">Catálogo</p>
        <h1 className="mia-title mt-3">Programas</h1>
        <p className="mia-lead mt-3">Explora lo que tenemos y compra el programa que necesitas, cuando quieras.</p>
      </div>

      {error ? (
        <p role="status" className="mia-alert mia-alert-error">
          No pudimos cargar el catálogo en este momento. Intenta de nuevo en unos minutos.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {productos.map((p) => (
          <article key={p.id} className="mia-card flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{p.nombre}</h2>
              {mios.has(p.slug) ? <span className="mia-chip mia-chip-ok">Tuyo</span> : null}
            </div>
            {p.resumen ? <p className="mia-muted mt-2 flex-1 text-sm leading-relaxed">{p.resumen}</p> : <div className="flex-1" />}
            <Link
              href={`/comunidad/programas/${p.slug}`}
              className={(mios.has(p.slug) ? botonSecundarioCls : botonCls) + " mt-5"}
            >
              {mios.has(p.slug) ? "Ver mi programa" : "Ver detalle"}
            </Link>
          </article>
        ))}
      </div>

      {!error && productos.length === 0 ? <p className="mia-muted">Todavía no hay programas publicados.</p> : null}
    </div>
  );
}
