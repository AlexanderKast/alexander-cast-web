import type { Metadata } from "next";
import Link from "next/link";
import { requireMiembro } from "@/lib/comunidad/auth";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";

export const metadata: Metadata = {
  title: "Mis programas · Plataforma",
  robots: { index: false, follow: false },
};

/** Los programas con derecho vigente de ESTA cuenta (puede haber varios). Una cuenta sin compras ve un estado vacío. */
export default async function MisProgramasPage() {
  const m = await requireMiembro();

  return (
    <div className="space-y-8">
      <div>
        <p className="mia-eyebrow">Tu biblioteca</p>
        <h1 className="mia-title mt-3">Mis programas</h1>
      </div>

      {m.derechos.length === 0 ? (
        <section className="mia-card max-w-xl">
          <h2 className="text-lg font-semibold">
            {m.derechosNoVigentes ? "Tus programas ya no están vigentes" : "Todavía no has adquirido un programa"}
          </h2>
          <p className="mia-muted mt-2 text-sm leading-relaxed">
            {m.derechosNoVigentes
              ? "Si crees que es un error, escríbenos y lo revisamos."
              : "Cuando compres uno, aparecerá aquí con todo su contenido."}
          </p>
          <Link href="/comunidad/programas" className={botonCls + " mt-5"}>
            Explorar programas
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {m.derechos.map((d) => (
            <article key={d.id} className="mia-card flex flex-col">
              <span className="mia-chip mia-chip-ok w-fit">Activo</span>
              <h2 className="mt-3 text-xl font-bold">{d.productoNombre}</h2>
              <p className="mia-muted mt-1 text-sm">
                Entrada: {d.entrada}
                {d.cohorte ? ` · ${d.cohorte.nombre}` : ""}
              </p>
              <Link href={`/comunidad/programas/${d.productoSlug}`} className={botonSecundarioCls + " mt-5"}>
                Abrir programa
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
