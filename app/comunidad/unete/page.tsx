import type { Metadata } from "next";
import Link from "next/link";
import { getMiembro } from "@/lib/comunidad/auth";
import { obtenerProductoPublicado, ventaAbierta } from "@/lib/comunidad/catalogo";
import { ventanaDeOferta, type OfertaVista } from "@/lib/comunidad/ofertas";
import {
  AVISO_CLAUDE,
  ETIQUETA_DERECHO,
  FAQ_MASTER,
  INCLUYE_TODOS,
  LO_QUE_TE_LLEVAS,
  PRODUCTO_PRINCIPAL,
  RESULTADOS,
  SESION_ARRANQUE,
} from "@/lib/comunidad/oferta";
import { sanearUtm, UTM_CAMPOS } from "@/lib/comunidad/consentimiento";
import { fechaCorta, formatoMoneda } from "@/lib/comunidad/precio";
import { Countdown } from "@/components/comunidad/Countdown";
import { EnlaceInteres, VistaLanding } from "@/components/comunidad/EventosLanding";
import { FormInformacion } from "@/components/comunidad/FormInformacion";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";

/** Página de venta pública: sí se puede indexar y compartir. Vende la propuesta y lleva a crear la cuenta. */
export const metadata: Metadata = {
  title: "Master IA 360 · Aprende a usar IA en tu negocio",
  description:
    "Programa en vivo de 4 semanas: 8 clases, entregables y 60 días de comunidad activa. Crea tu cuenta gratis y elige tu entrada dentro de la plataforma.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

type Busqueda = Record<string, string | undefined>;

/** Arma el enlace al registro conservando el programa de interés, el origen y las UTM (saneadas). */
function enlaceRegistro(base: string, extra: Record<string, string | undefined>, sp: Busqueda): string {
  const q = new URLSearchParams();
  q.set("programa", PRODUCTO_PRINCIPAL);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  if (sp.o === "stand") q.set("o", "stand");
  for (const c of UTM_CAMPOS) {
    const v = sanearUtm(sp[c]);
    if (v) q.set(c, v);
  }
  return `${base}?${q.toString()}`;
}

export default async function UnetePage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const sp = await searchParams;
  const miembro = await getMiembro();

  // El catálogo sale de la base: la landing muestra EXACTAMENTE lo que luego se cobra. Si no responde, se dice.
  let producto = null;
  let catalogoCaido = false;
  try {
    producto = await obtenerProductoPublicado(PRODUCTO_PRINCIPAL);
  } catch {
    catalogoCaido = true;
  }
  const venta = producto ? await ventaAbierta(producto.id).catch(() => null) : null;
  const ahora = new Date();
  const abiertas: OfertaVista[] = (venta?.ofertas ?? []).filter((o) => ventanaDeOferta(o, ahora) === "abierta");
  const ventaDisponible = venta?.abierta === true;

  // Oferta destacada: la primera abierta que tiene fecha de cierre (data-driven, no un «precio de feria» fijo en el código).
  const destacada = abiertas.find((o) => o.disponibleHasta) ?? null;
  const conSesion = destacada?.derechos.includes("sesion_arranque") ?? false;

  const hrefCrearCuenta = miembro ? `/comunidad/programas/${PRODUCTO_PRINCIPAL}` : enlaceRegistro("/comunidad/registro", {}, sp);
  const hrefAsesor = miembro
    ? `/comunidad/programas/${PRODUCTO_PRINCIPAL}#asesor`
    : enlaceRegistro("/comunidad/registro", { asesor: "1" }, sp);
  const utm: Record<string, string> = {};
  for (const c of UTM_CAMPOS) {
    const v = sanearUtm(sp[c]);
    if (v) utm[c] = v;
  }

  return (
    <div className="space-y-14 sm:space-y-20">
      <VistaLanding programa={PRODUCTO_PRINCIPAL} />

      {/* Hero */}
      <header className="relative isolate">
        <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72" />
        <p className="mia-eyebrow">Cohorte 1 · empieza el 22 de octubre</p>
        <h1 className="mia-title mt-4 max-w-3xl">Aprende a usar IA en tu negocio, en vivo y acompañado</h1>
        <p className="mia-lead mt-5">
          Master IA 360 es un programa de 4 semanas, con 8 clases en vivo y entregables, para pasar de «probar
          herramientas» a tener sistemas funcionando en tu negocio.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {ventaDisponible || !producto ? (
            <EnlaceInteres programa={PRODUCTO_PRINCIPAL} href={hrefCrearCuenta} className={botonCls}>
              {miembro ? "Ver el programa en mi cuenta" : "Crear cuenta para continuar"}
            </EnlaceInteres>
          ) : (
            <a href="#lista-de-espera" className={botonCls}>
              Unirme a la lista de espera
            </a>
          )}
          {ventaDisponible ? (
            <Link href={hrefAsesor} className={botonSecundarioCls + " !min-h-12 px-6 text-base"}>
              Quiero que me asesoren
            </Link>
          ) : null}
        </div>
        <p className="mia-muted mt-4 text-sm">
          Crear la cuenta es gratis y no es una compra: eliges tu entrada dentro de la plataforma.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="mia-chip">100% virtual</span>
          <span className="mia-chip">8 clases en vivo</span>
          <span className="mia-chip">Cupos limitados</span>
        </div>
      </header>

      {catalogoCaido ? (
        <p role="status" className="mia-alert">
          No pudimos cargar las entradas y precios en este momento. Vuelve a intentarlo en unos minutos.
        </p>
      ) : null}

      {/* Resultados */}
      <section aria-labelledby="resultados">
        <p id="resultados" className="mia-eyebrow">
          Qué construyes
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {RESULTADOS.map(([t, d]) => (
            <article key={t} className="mia-card-soft !p-5">
              <h2 className="text-lg font-semibold">{t}</h2>
              <p className="mia-muted mt-1 text-sm leading-relaxed">{d}</p>
            </article>
          ))}
        </div>
        <p className="mia-eyebrow mt-8">Lo que te llevas</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {LO_QUE_TE_LLEVAS.map((x) => (
            <li key={x} className="mia-card flex gap-3 !p-4 text-sm leading-relaxed">
              <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
              {x}
            </li>
          ))}
        </ul>
      </section>

      {/* Beneficios y modalidad */}
      <section aria-labelledby="modalidad">
        <p id="modalidad" className="mia-eyebrow">
          Modalidad y beneficios
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {INCLUYE_TODOS.map((x) => (
            <li key={x} className="mia-card-soft flex gap-3 !p-4 text-sm leading-relaxed">
              <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
              {x}
            </li>
          ))}
        </ul>
        <p role="note" className="mia-alert mt-4">
          <strong>Importante:</strong> {AVISO_CLAUDE}
        </p>
      </section>

      {/* Entradas: precios y diferencias visibles ANTES de crear la cuenta */}
      <section id="entradas" aria-labelledby="entradas-titulo" className="scroll-mt-24">
        <p id="entradas-titulo" className="mia-eyebrow">
          Entradas
        </p>

        {destacada && ventaDisponible ? (
          <div className="mia-card-dark mt-4">
            <p className="mia-eyebrow">
              {destacada.nombre} · hasta el {fechaCorta(destacada.disponibleHasta as string)}
            </p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              {formatoMoneda(destacada.precioCentavos, destacada.moneda)}
              {conSesion ? ` y entras con la ${SESION_ARRANQUE.titulo.toLowerCase()}` : ""}
            </h2>
            {conSesion ? <p className="mia-lead mt-3">{SESION_ARRANQUE.resumen}</p> : null}
            <p className="mia-label mt-7 !text-[var(--mia-dark-muted)]">Esta entrada cierra en</p>
            <Countdown hasta={new Date(destacada.disponibleHasta as string).toISOString()} />
            <p className="mt-4 text-xs text-[var(--mia-dark-muted)]">
              Los precios y la disponibilidad se confirman al comprar dentro de tu cuenta.
            </p>
          </div>
        ) : null}

        {ventaDisponible ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {abiertas.map((o) => (
              <article key={o.id} className="mia-card flex flex-col">
                <h2 className="text-lg font-semibold">{o.nombre}</h2>
                <p className="mt-2 font-[family-name:var(--mia-font-display)] text-3xl font-bold tracking-tight">
                  {formatoMoneda(o.precioCentavos, o.moneda)}{" "}
                  <span className="mia-muted text-sm font-normal">{o.moneda.toUpperCase()}</span>
                </p>
                {o.nota ? <p className="mia-muted mt-1 text-sm">{o.nota}</p> : null}
                <p className="mia-label mt-5">Además de todo lo anterior</p>
                <ul className="flex-1 space-y-1.5 text-sm">
                  {o.derechos.length || o.extras.length ? (
                    (o.extras.length ? o.extras : o.derechos.map((d) => ETIQUETA_DERECHO[d] ?? d)).map((x) => (
                      <li key={x} className="flex gap-2">
                        <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
                        {x}
                      </li>
                    ))
                  ) : (
                    <li className="mia-muted">Sin extras: el programa completo.</li>
                  )}
                </ul>
                <EnlaceInteres
                  programa={PRODUCTO_PRINCIPAL}
                  href={
                    miembro
                      ? `/comunidad/programas/${PRODUCTO_PRINCIPAL}#oferta-${o.slug}`
                      : enlaceRegistro("/comunidad/registro", { oferta: o.slug }, sp)
                  }
                  className={botonCls + " mt-5"}
                >
                  {miembro ? `Elegir ${o.nombre.split(" ·")[0]}` : "Crear cuenta y elegir"}
                </EnlaceInteres>
              </article>
            ))}
          </div>
        ) : producto ? (
          <p className="mia-alert mt-4">
            Las inscripciones de esta cohorte no están disponibles en este momento (cerraron o se agotaron los cupos).
            Puedes dejar tus datos en la lista de espera; no es una reserva.
          </p>
        ) : null}
        {venta?.cuposDesconocidos ? (
          <p role="status" className="mia-muted mt-3 text-sm">
            No pudimos consultar los cupos ahora. La disponibilidad se confirma al comprar.
          </p>
        ) : null}
      </section>

      {/* Siguiente paso */}
      {ventaDisponible ? (
        <section aria-labelledby="como-sigue" className="mia-card mx-auto max-w-2xl text-center">
          <h2 id="como-sigue" className="text-xl font-bold">
            Cómo sigue
          </h2>
          <ol className="mia-muted mt-3 space-y-1 text-sm">
            <li>1. Creas tu cuenta gratis y confirmas tu correo.</li>
            <li>2. Eliges tu entrada y pagas dentro de la plataforma.</li>
            <li>3. Cuando se confirma el pago, el programa aparece en «Mis programas».</li>
          </ol>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <EnlaceInteres programa={PRODUCTO_PRINCIPAL} href={hrefCrearCuenta} className={botonCls}>
              {miembro ? "Ver el programa en mi cuenta" : "Crear cuenta para continuar"}
            </EnlaceInteres>
            {!miembro ? (
              <Link href={`/comunidad/login?next=/comunidad/programas/${PRODUCTO_PRINCIPAL}`} className={botonSecundarioCls + " !min-h-12 px-6 text-base"}>
                Ya tengo cuenta
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Lista de espera: solo con ventas cerradas o sin cupos */}
      {producto && !ventaDisponible ? (
        <section id="lista-de-espera" aria-labelledby="espera-titulo" className="scroll-mt-24">
          <p className="mia-eyebrow">Lista de espera</p>
          <div className="mia-card mx-auto mt-4 max-w-xl">
            <h2 id="espera-titulo" className="text-xl font-bold">
              Déjanos tus datos para la próxima cohorte
            </h2>
            <p className="mia-muted mb-5 mt-2 text-sm leading-relaxed">
              Queda en la lista de espera. No es una reserva ni un cobro, y no crea una cuenta.
            </p>
            <FormInformacion origen={sp.o === "stand" ? "stand" : "web"} utm={utm} listaDeEspera />
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section aria-labelledby="faq">
        <p id="faq" className="mia-eyebrow">
          Preguntas frecuentes
        </p>
        <div className="mt-4 divide-y divide-[var(--mia-border)] rounded-2xl border border-[var(--mia-border)] bg-[var(--mia-elev)]">
          {FAQ_MASTER.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold">{q}</summary>
              <p className="mia-muted mt-2 text-sm leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mia-muted flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--mia-border)] pt-6 text-sm">
        <Link href="/legal/privacidad" className="mia-link">
          Política de privacidad
        </Link>
        <Link href="/legal/terminos" className="mia-link">
          Términos
        </Link>
        <span>Master IA 360 · IA Master Tech</span>
      </footer>
    </div>
  );
}
