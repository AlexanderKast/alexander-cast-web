import Link from "next/link";
import type { ReactNode } from "react";
import { INCLUYE_TODOS } from "@/lib/comunidad/oferta";
import {
  CIFRAS,
  COMO_FUNCIONA_ASESORIA,
  ENTREGABLES,
  INSTRUCTOR,
  NO_INCLUYE,
  PARA_QUIEN,
  SECUENCIA,
} from "@/lib/comunidad/landing";
import "./landing.css";
import "./historia.css";

const BASE = "/comunidad/landing";

/** Imagen AVIF/WebP con dimensiones explícitas; carga diferida (el único recurso prioritario es el hero). */
export function Imagen({
  nombre,
  ancho,
  alto,
  alt,
  sizes,
}: {
  nombre: string;
  ancho: number;
  alto: number;
  alt: string;
  sizes: string;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={`${BASE}/${nombre}.avif`} sizes={sizes} />
      <source type="image/webp" srcSet={`${BASE}/${nombre}.webp`} sizes={sizes} />
      <img src={`${BASE}/${nombre}.webp`} width={ancho} height={alto} alt={alt} loading="lazy" decoding="async" sizes={sizes} />
    </picture>
  );
}

export function Titulo({ id, eyebrow, children }: { id: string; eyebrow: string; children: ReactNode }) {
  return (
    <>
      <p className="mia-eyebrow" data-reveal>
        {eyebrow}
      </p>
      <h2 id={id} className="ml-h2" data-reveal style={{ ["--i" as string]: 1 }}>
        {children}
      </h2>
    </>
  );
}

/** Tres entregables en tarjetas de texto (landing de asesoría). Son lo que entrega el programa, no resultados de alumnos. */
export function EntregablesTexto() {
  return (
    <section id="entregables" aria-labelledby="entregables-t" className="ml-seccion">
      <Titulo id="entregables-t" eyebrow="Qué podrías construir">
        Tres construcciones, aplicadas a tu negocio
      </Titulo>
      <div className="ml-pasos" style={{ gridTemplateColumns: undefined }}>
        {ENTREGABLES.map((e, i) => (
          <article key={e.clave} className="mia-card-soft !p-5" data-reveal style={{ ["--i" as string]: i }}>
            <span className="mia-chip mia-chip-ok">{e.clase}</span>
            <h3 className="mt-3 text-lg font-semibold">{e.titulo}</h3>
            <p className="mia-muted mt-1 text-sm leading-relaxed">{e.texto}</p>
            <p className="mia-muted mt-3 text-xs">{e.nota}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Franja de cifras reales del programa; se animan al entrar en pantalla (EfectosScroll). */
export function Cifras() {
  return (
    <section aria-label="El programa en cifras" className="ml-cifras" data-reveal>
      {CIFRAS.map((c) => (
        <div key={c.etiqueta}>
          <p className="ml-cifra">
            <span data-contar={c.valor} data-decimales={c.decimales} data-reveal>
              {String(c.valor).replace(".", ",")}
            </span>
          </p>
          <p className="ml-cifra-etq">{c.etiqueta}</p>
        </div>
      ))}
    </section>
  );
}

export function Secuencia() {
  return (
    <section id="como-se-aprende" aria-labelledby="secuencia-t" className="ml-seccion">
      <Titulo id="secuencia-t" eyebrow="Cómo se aprende">
        En vivo, acompañado y con material para repetir
      </Titulo>
      <ol className="ml-linea">
        {SECUENCIA.map(([t, d]) => (
          <li key={t} className="ml-paso" data-reveal>
            <h3>{t}</h3>
            <p>{d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Instructor: foto real y descripción verificable. No hay testimonios porque no hay una cohorte previa. */
export function BloqueInstructor() {
  return (
    <section id="instructor" aria-labelledby="instructor-t" className="ml-banda">
      <div className="ml-banda-in ml-instructor">
        <Imagen nombre="instructor" ancho={640} alto={800} alt="Alexander Cast, instructor del programa" sizes="(min-width: 768px) 20rem, 80vw" />
        <div>
          <p className="mia-eyebrow">Quién lo dirige</p>
          <h2 id="instructor-t" className="ml-h2">
            {INSTRUCTOR.nombre}
          </h2>
          <p className="mia-muted mt-2 text-sm">{INSTRUCTOR.rol}</p>
          <p className="ml-intro">{INSTRUCTOR.texto}</p>
          <p className="ml-intro">
            Es la primera cohorte de Master IA 360, así que todavía no hay testimonios de alumnos de este programa.
          </p>
          <Link href={INSTRUCTOR.enlace.href} className="mia-btn mia-btn-secondary mia-btn-sm mt-5 !border-[rgba(247,254,231,0.35)] !bg-transparent !text-[var(--mia-dark-text)]">
            {INSTRUCTOR.enlace.etiqueta}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function IncluyeNoIncluye({ aviso }: { aviso?: ReactNode }) {
  return (
    <section id="incluye" aria-labelledby="incluye-t" className="ml-seccion">
      <Titulo id="incluye-t" eyebrow="Qué incluye y qué no">
        Claro desde el principio
      </Titulo>
      <div className="ml-doble">
        <div className="mia-card" data-reveal>
          <h3 className="font-semibold">Todas las entradas incluyen</h3>
          <ul className="ml-lista ml-lista-si">
            {INCLUYE_TODOS.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="mia-card-soft" data-reveal style={{ ["--i" as string]: 1 }}>
          <h3 className="font-semibold">No incluye</h3>
          <ul className="ml-lista ml-lista-no">
            {NO_INCLUYE.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
      {aviso}
    </section>
  );
}

export function ParaQuien() {
  return (
    <section id="para-quien" aria-labelledby="para-quien-t" className="ml-seccion">
      <Titulo id="para-quien-t" eyebrow="Para quién es">
        Para quién sí, y para quién no
      </Titulo>
      <div className="ml-doble">
        <div className="mia-card" data-reveal>
          <h3 className="font-semibold">Es para ti si…</h3>
          <ul className="ml-lista ml-lista-si">
            {PARA_QUIEN.si.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="mia-card-soft" data-reveal style={{ ["--i" as string]: 1 }}>
          <h3 className="font-semibold">Probablemente no lo es si…</h3>
          <ul className="ml-lista ml-lista-no">
            {PARA_QUIEN.no.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function ComoFuncionaAsesoria() {
  return (
    <section id="como-funciona" aria-labelledby="asesoria-t" className="ml-seccion">
      <Titulo id="asesoria-t" eyebrow="Cómo funciona la asesoría">
        Cuatro pasos, sin presión
      </Titulo>
      <ol className="ml-pasos">
        {COMO_FUNCIONA_ASESORIA.map(([t, d]) => (
          <li key={t} className="mia-card-soft !p-5" data-reveal>
            <h3 className="font-semibold">{t}</h3>
            <p className="mia-muted mt-1 text-sm leading-relaxed">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Faq({ id = "faq", preguntas }: { id?: string; preguntas: readonly (readonly [string, string])[] }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="ml-seccion">
      <Titulo id={`${id}-t`} eyebrow="Preguntas frecuentes">
        Lo que suelen preguntar antes de decidir
      </Titulo>
      <div className="mt-6 divide-y divide-[var(--mia-border)] rounded-2xl border border-[var(--mia-border)] bg-[var(--mia-elev)]">
        {preguntas.map(([q, a]) => (
          <details key={q} className="group p-5">
            <summary className="cursor-pointer list-none text-sm font-semibold">{q}</summary>
            <p className="mia-muted mt-2 text-sm leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PieLanding() {
  return (
    <footer className="mia-muted mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--mia-border)] pt-6 text-sm">
      <Link href="/legal/privacidad" className="mia-link">
        Política de privacidad
      </Link>
      <Link href="/legal/terminos" className="mia-link">
        Términos
      </Link>
      <span>Master IA 360 · IA Master Tech</span>
    </footer>
  );
}
