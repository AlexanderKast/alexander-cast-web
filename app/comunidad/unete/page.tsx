import type { Metadata } from "next";
import Link from "next/link";
import { AVISO_CLAUDE, PRODUCTO_PRINCIPAL } from "@/lib/comunidad/oferta";
import { cargarDatosLanding, enlaceRegistro, type Busqueda } from "@/lib/comunidad/landing-datos";
import { ANCLAS_HISTORIA, CTA, FAQ_OBJECIONES, HISTORIA, MICROCOPY } from "@/lib/comunidad/landing";
import { EnlaceInteres, VistaLanding } from "@/components/comunidad/EventosLanding";
import { FormInformacion } from "@/components/comunidad/FormInformacion";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";
import { CtaFijoMovil } from "@/components/comunidad/landing/CtaFijoMovil";
import { EfectosScroll } from "@/components/comunidad/landing/EfectosScroll";
import { EscenaHero } from "@/components/comunidad/landing/EscenaHero";
import { HistoriaScroll } from "@/components/comunidad/landing/HistoriaScroll";
import { OfertasBloque } from "@/components/comunidad/landing/OfertasBloque";
import {
  BloqueInstructor,
  Cifras,
  Faq,
  Imagen,
  IncluyeNoIncluye,
  ParaQuien,
  PieLanding,
  Secuencia,
  Titulo,
} from "@/components/comunidad/landing/secciones";

/**
 * Landing de VENTA. Objetivo: cuenta verificada con intención de compra y, al final, compra confirmada.
 * La compra y la elegibilidad siguen decidiéndose en el servidor; esta página solo informa y lleva al registro.
 */
export const metadata: Metadata = {
  title: "Master IA 360 · Construye una web, una app y una herramienta con IA",
  description:
    "Programa en vivo de 4 semanas: 8 clases, plantillas y acompañamiento para aplicar IA a tu negocio, más 60 días de comunidad. Crea tu cuenta gratis y elige tu entrada dentro de la plataforma.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Master IA 360 · Aprende a construir con IA para tu negocio",
    description: "8 clases en vivo, plantillas y acompañamiento. Crear la cuenta es gratis.",
  },
};

export const dynamic = "force-dynamic";

export default async function UnetePage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const sp = await searchParams;
  const d = await cargarDatosLanding(sp);
  const { miembro, producto, ventaDisponible, esDueno } = d;

  // Destino del CTA principal según el estado de la persona (la autorización real sigue en servidor).
  const hrefCta = esDueno
    ? "/comunidad/mis-programas"
    : miembro
      ? `/comunidad/programas/${PRODUCTO_PRINCIPAL}`
      : enlaceRegistro({}, sp);
  const textoCta = esDueno ? CTA.venta.dueno : miembro ? CTA.venta.autenticado : CTA.venta.publico;
  const hrefAsesoria = "/comunidad/unete/asesoria";
  const mostrarCta = ventaDisponible || esDueno || !producto;

  return (
    <div className="ml-landing">
      <VistaLanding programa={PRODUCTO_PRINCIPAL} variante="venta" />
      <EfectosScroll />

      {/* 1. Hero: destinatario + resultado + mecanismo */}
      <header className="ml-hero">
        <div className="ml-hero-texto">
          <p className="mia-eyebrow">Cohorte 1 · empieza el 22 de octubre</p>
          <h1 className="ml-hero-titulo">
            Aprende a construir <em>una web, una app y una herramienta</em> para tu negocio con IA
          </h1>
          <p className="ml-hero-sub">
            Un programa en vivo de 4 semanas: 8 clases de 2,5 horas, plantillas y acompañamiento para aplicar la IA a tu negocio,
            más 60 días de comunidad.
          </p>
          <div className="ml-hero-acciones">
            {mostrarCta ? (
              <EnlaceInteres id="cta-principal" programa={PRODUCTO_PRINCIPAL} posicion="hero" href={hrefCta} className={botonCls + " !min-h-14 px-8 text-base"}>
                {textoCta}
              </EnlaceInteres>
            ) : (
              <a id="cta-principal" href="#lista-de-espera" className={botonCls + " !min-h-14 px-8 text-base"}>
                Unirme a la lista de espera
              </a>
            )}
            <Link href={hrefAsesoria} className={botonSecundarioCls + " !min-h-12 px-6 text-base"}>
              Prefiero que me asesoren
            </Link>
          </div>
          {!esDueno ? <p className="ml-hero-micro">{MICROCOPY.venta}</p> : null}
          <div className="ml-hero-datos">
            <span className="mia-chip">100% virtual</span>
            <span className="mia-chip">8 clases en vivo</span>
            <span className="mia-chip">Cupos limitados</span>
          </div>
        </div>
        <EscenaHero />
      </header>

      {d.catalogoCaido ? (
        <p role="status" className="mia-alert mt-8">
          No pudimos cargar las entradas y precios en este momento. Vuelve a intentarlo en unos minutos.
        </p>
      ) : null}

      <Cifras />
      <HistoriaScroll
        titulo="Lo que construyes en Master IA 360, paso a paso"
        capitulos={HISTORIA.map((c) => ({ ...c }))}
        anclas={ANCLAS_HISTORIA}
        cta={
          mostrarCta ? (
            <div className="space-y-3">
              <EnlaceInteres programa={PRODUCTO_PRINCIPAL} posicion="historia" href={hrefCta} className={botonCls + " !min-h-14 px-8 text-base"}>
                {textoCta}
              </EnlaceInteres>
              {!esDueno ? <p className="text-xs text-[var(--mia-dark-muted)]">{MICROCOPY.venta}</p> : null}
            </div>
          ) : null
        }
      />
      <Secuencia />
      <BloqueInstructor />
      <IncluyeNoIncluye
        aviso={
          <p role="note" className="mia-alert mt-4">
            <strong>Importante:</strong> {AVISO_CLAUDE}
          </p>
        }
      />
      <OfertasBloque d={d} sp={sp} />
      <ParaQuien />

      {/* Lista de espera: solo con ventas cerradas o sin cupos */}
      {producto && !ventaDisponible ? (
        <section id="lista-de-espera" aria-labelledby="espera-t" className="ml-seccion">
          <Titulo id="espera-t" eyebrow="Lista de espera">
            Déjanos tus datos para la próxima cohorte
          </Titulo>
          <div className="mia-card mt-6 max-w-xl">
            <p className="mia-muted mb-5 text-sm leading-relaxed">
              Queda en la lista de espera. No es una reserva ni un cobro, y no crea una cuenta.
            </p>
            <FormInformacion origen={d.origen} utm={d.utm} listaDeEspera />
          </div>
        </section>
      ) : null}

      <Faq preguntas={FAQ_OBJECIONES} />

      {/* Cierre: el mismo CTA, con la misma promesa */}
      <section id="cierre" aria-labelledby="cierre-t" className="ml-seccion ml-cierre">
        <div>
          <Titulo id="cierre-t" eyebrow="Siguiente paso">
            Crea tu cuenta y mira las entradas con calma
          </Titulo>
          <p className="ml-intro">{MICROCOPY.venta}</p>
          {mostrarCta ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <EnlaceInteres programa={PRODUCTO_PRINCIPAL} posicion="cierre" href={hrefCta} className={botonCls + " !min-h-14 px-8 text-base"}>
                {textoCta}
              </EnlaceInteres>
              {!miembro ? (
                <Link href={`/comunidad/login?next=/comunidad/programas/${PRODUCTO_PRINCIPAL}`} className={botonSecundarioCls + " !min-h-12 px-6 text-base"}>
                  Ya tengo cuenta
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <Imagen nombre="escena-poster" ancho={1170} alto={600} alt="" sizes="(min-width: 768px) 28rem, 92vw" />
      </section>

      <PieLanding />

      {mostrarCta ? (
        <CtaFijoMovil ocultarEn={["entradas", "cierre", "historia"]}>
          <EnlaceInteres programa={PRODUCTO_PRINCIPAL} posicion="fijo-movil" href={hrefCta} className={botonCls}>
            {textoCta}
          </EnlaceInteres>
        </CtaFijoMovil>
      ) : null}
    </div>
  );
}
