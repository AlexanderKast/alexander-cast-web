import { ETIQUETA_DERECHO, PRODUCTO_PRINCIPAL, SESION_ARRANQUE } from "@/lib/comunidad/oferta";
import { enlaceRegistro, type Busqueda, type DatosLanding } from "@/lib/comunidad/landing-datos";
import { fechaCorta, formatoMoneda } from "@/lib/comunidad/precio";
import { Countdown } from "@/components/comunidad/Countdown";
import { EnlaceInteres } from "@/components/comunidad/EventosLanding";
import { botonCls } from "@/components/comunidad/ui";
import { Titulo } from "./secciones";
import "./landing.css";

/**
 * Entradas con precio, vigencia y diferencias. TODO sale de la base (la misma fuente que el cobro): si una oferta
 * venció o se agotó, no se muestra ni se promete. No hay entrada preseleccionada ni etiquetas «más vendido».
 */
export function OfertasBloque({ d, sp }: { d: DatosLanding; sp: Busqueda }) {
  const { producto, abiertas, destacada, ventaDisponible, miembro } = d;
  const conSesion = destacada?.derechos.includes("sesion_arranque") ?? false;

  return (
    <section id="entradas" aria-labelledby="entradas-t" className="ml-seccion">
      <Titulo id="entradas-t" eyebrow="Entradas">
        Elige la entrada que se ajusta a ti
      </Titulo>

      {destacada && ventaDisponible ? (
        <div className="mia-card-dark mt-6">
          <p className="mia-eyebrow">
            {destacada.nombre} · hasta el {fechaCorta(destacada.disponibleHasta as string)}
          </p>
          <p className="mt-3 font-[family-name:var(--mia-font-display)] text-2xl font-bold sm:text-3xl">
            {formatoMoneda(destacada.precioCentavos, destacada.moneda)}
            {conSesion ? ` y entras con la ${SESION_ARRANQUE.titulo.toLowerCase()}` : ""}
          </p>
          {conSesion ? <p className="mia-lead mt-3">{SESION_ARRANQUE.resumen}</p> : null}
          <p className="mia-label mt-7 !text-[var(--mia-dark-muted)]">Esta entrada cierra en</p>
          <Countdown hasta={new Date(destacada.disponibleHasta as string).toISOString()} />
          <p className="mt-4 text-xs text-[var(--mia-dark-muted)]">
            Los precios y la disponibilidad se confirman al comprar dentro de tu cuenta.
          </p>
        </div>
      ) : null}

      {ventaDisponible ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {abiertas.map((o) => (
            <article key={o.id} className="mia-card flex flex-col">
              <h3 className="text-lg font-semibold">{o.nombre}</h3>
              <p className="mt-2 font-[family-name:var(--mia-font-display)] text-3xl font-bold tracking-tight">
                {formatoMoneda(o.precioCentavos, o.moneda)}{" "}
                <span className="mia-muted text-sm font-normal">{o.moneda.toUpperCase()}</span>
              </p>
              {o.nota ? <p className="mia-muted mt-1 text-sm">{o.nota}</p> : null}
              <p className="mia-label mt-5">Además de todo lo anterior</p>
              <ul className="flex-1 space-y-1.5 text-sm">
                {o.derechos.length || o.extras.length ? (
                  (o.extras.length ? o.extras : o.derechos.map((x) => ETIQUETA_DERECHO[x] ?? x)).map((x) => (
                    <li key={x} className="flex gap-2">
                      <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">
                        ✓
                      </span>
                      {x}
                    </li>
                  ))
                ) : (
                  <li className="mia-muted">Sin extras: el programa completo.</li>
                )}
              </ul>
              <EnlaceInteres
                programa={PRODUCTO_PRINCIPAL}
                posicion={`oferta-${o.slug}`}
                href={miembro ? `/comunidad/programas/${PRODUCTO_PRINCIPAL}#oferta-${o.slug}` : enlaceRegistro({ oferta: o.slug }, sp)}
                className={botonCls + " mt-5"}
              >
                {miembro ? `Elegir ${o.nombre.split(" ·")[0]}` : "Crear cuenta y elegir"}
              </EnlaceInteres>
            </article>
          ))}
        </div>
      ) : producto ? (
        <p className="mia-alert mt-6">
          Las inscripciones de esta cohorte no están disponibles en este momento (cerraron o se agotaron los cupos). Puedes dejar tus
          datos en la lista de espera; no es una reserva.
        </p>
      ) : null}

      {d.cuposDesconocidos ? (
        <p role="status" className="mia-muted mt-3 text-sm">
          No pudimos consultar los cupos ahora. La disponibilidad se confirma al comprar.
        </p>
      ) : null}
    </section>
  );
}
