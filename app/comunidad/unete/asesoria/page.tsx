import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTO_PRINCIPAL } from "@/lib/comunidad/oferta";
import { cargarDatosLanding, enlaceRegistro, type Busqueda } from "@/lib/comunidad/landing-datos";
import { CTA, FAQ_ASESORIA, MICROCOPY } from "@/lib/comunidad/landing";
import { EnlaceInteres, VistaLanding } from "@/components/comunidad/EventosLanding";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";
import { CtaFijoMovil } from "@/components/comunidad/landing/CtaFijoMovil";
import { EfectosScroll } from "@/components/comunidad/landing/EfectosScroll";
import { EscenaHero } from "@/components/comunidad/landing/EscenaHero";
import {
  BloqueInstructor,
  ComoFuncionaAsesoria,
  Cifras,
  EntregablesTexto,
  Faq,
  ParaQuien,
  PieLanding,
  Titulo,
} from "@/components/comunidad/landing/secciones";

/**
 * Landing de CAPTACIÓN / ASESORÍA. Objetivo: cuenta verificada + solicitud explícita de asesoría vinculada al
 * programa. Un registro NO es un lead cualificado: la solicitud solo se confirma cuando queda guardada en servidor.
 * Es una página de campaña: no se indexa para no competir con la landing de venta.
 */
export const metadata: Metadata = {
  title: "Master IA 360 · Asesoría para aplicar IA a tu negocio",
  description:
    "Crea tu cuenta y pide que un asesor te ayude a decidir si Master IA 360 encaja con tu negocio y qué entrada te conviene.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function AsesoriaPage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const sp = await searchParams;
  const d = await cargarDatosLanding(sp);
  const { miembro, producto, ventaDisponible, esDueno } = d;

  // Ya autenticado: va directo a la solicitud interna, sin registrarse otra vez.
  const hrefCta = esDueno
    ? "/comunidad/mis-programas"
    : miembro
      ? `/comunidad/programas/${PRODUCTO_PRINCIPAL}#asesor`
      : enlaceRegistro({ asesor: "1" }, sp);
  const textoCta = esDueno ? CTA.asesoria.dueno : miembro ? CTA.asesoria.autenticado : CTA.asesoria.publico;
  // Sin venta abierta no se ofrece asesoría de compra: se dice y se deriva a la lista de espera.
  const mostrarCta = ventaDisponible || esDueno;

  return (
    <div className="ml-landing">
      <VistaLanding programa={PRODUCTO_PRINCIPAL} variante="asesoria" />
      <EfectosScroll />

      <header className="ml-hero">
        <div className="ml-hero-texto">
          <p className="mia-eyebrow">Master IA 360 · Cohorte 1</p>
          <h1 className="ml-hero-titulo">
            Descubre cómo <em>aplicar IA a tu negocio</em> con acompañamiento
          </h1>
          <p className="ml-hero-sub">
            Master IA 360 es un programa de pago en vivo de 4 semanas. Si no tienes claro si encaja con tu negocio o qué entrada te
            conviene, pide que un asesor te ayude a decidirlo.
          </p>
          <div className="ml-hero-acciones">
            {mostrarCta ? (
              <EnlaceInteres
                id="cta-principal"
                programa={PRODUCTO_PRINCIPAL}
                variante="asesoria"
                posicion="hero"
                href={hrefCta}
                className={botonCls + " !min-h-14 px-8 text-base"}
              >
                {textoCta}
              </EnlaceInteres>
            ) : (
              <Link id="cta-principal" href="/comunidad/unete#lista-de-espera" className={botonCls + " !min-h-14 px-8 text-base"}>
                Ver la lista de espera
              </Link>
            )}
            <Link href="/comunidad/unete" className={botonSecundarioCls + " !min-h-12 px-6 text-base"}>
              Prefiero ver el programa y comprar
            </Link>
          </div>
          {!esDueno && mostrarCta ? <p className="ml-hero-micro">{MICROCOPY.asesoria}</p> : null}
          {!mostrarCta && producto ? (
            <p className="ml-hero-micro">Las inscripciones no están disponibles en este momento, así que ahora no podemos tomar solicitudes de asesoría.</p>
          ) : null}
          <div className="ml-hero-datos">
            <span className="mia-chip">Programa de pago</span>
            <span className="mia-chip">Crear la cuenta es gratis</span>
          </div>
        </div>
        <EscenaHero />
      </header>

      {d.catalogoCaido ? (
        <p role="status" className="mia-alert mt-8">
          No pudimos cargar el catálogo en este momento. Vuelve a intentarlo en unos minutos.
        </p>
      ) : null}

      <Cifras />
      <ParaQuien />
      <EntregablesTexto />
      <ComoFuncionaAsesoria />
      <BloqueInstructor />

      <section id="cierre" aria-labelledby="cierre-t" className="ml-seccion">
        <Titulo id="cierre-t" eyebrow="Siguiente paso">
          Empieza por crear tu cuenta
        </Titulo>
        <p className="ml-intro">{MICROCOPY.asesoria}</p>
        {mostrarCta ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <EnlaceInteres programa={PRODUCTO_PRINCIPAL} variante="asesoria" posicion="cierre" href={hrefCta} className={botonCls + " !min-h-14 px-8 text-base"}>
              {textoCta}
            </EnlaceInteres>
            {!miembro ? (
              <Link href={`/comunidad/login?next=/comunidad/programas/${PRODUCTO_PRINCIPAL}`} className={botonSecundarioCls + " !min-h-12 px-6 text-base"}>
                Ya tengo cuenta
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <Faq id="dudas" preguntas={FAQ_ASESORIA} />
      <PieLanding />

      {mostrarCta ? (
        <CtaFijoMovil ocultarEn={["cierre"]}>
          <EnlaceInteres programa={PRODUCTO_PRINCIPAL} variante="asesoria" posicion="fijo-movil" href={hrefCta} className={botonCls}>
            {textoCta}
          </EnlaceInteres>
        </CtaFijoMovil>
      ) : null}
    </div>
  );
}
