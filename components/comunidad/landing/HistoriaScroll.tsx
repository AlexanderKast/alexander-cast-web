"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { soportaWebmAlfa } from "./EscenaHero";

export interface Capitulo {
  clave: string;
  /** Etiqueta corta sobre el título (p. ej. «Clase 3»). */
  chip?: string;
  titulo: string;
  texto: string;
  nota?: string;
}

const BASE = "/comunidad/landing";
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

type Modo = "estatico" | "scrub";

/** Modo según el dispositivo. En el servidor (y durante la hidratación) siempre es «estatico»: sin saltos de layout. */
function calcularModo(): Modo {
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return reducir || conn?.saveData || !soportaWebmAlfa() ? "estatico" : "scrub";
}
const sinSuscripcion = () => () => undefined;

/**
 * Historia con scroll («scrollytelling»): el video SIN FONDO de los tres módulos (web, app y herramienta) avanza al
 * ritmo del scroll mientras cambia el capítulo. Cada capítulo responde una duda de compra y el último lleva el CTA.
 *
 * - Anclas: fracción del video (0–1) que se muestra en el centro de cada capítulo; entre capítulos se interpola.
 * - Con «reducir movimiento», ahorro de datos o sin WebM con alfa (Safari), la sección es estática: poster + capítulos
 *   apilados, todo legible y con el mismo CTA. El video solo se descarga al acercarse a la sección.
 * - Lectores de pantalla: el escenario animado es aria-hidden y el texto completo va en una lista visualmente oculta.
 */
export function HistoriaScroll({
  capitulos,
  anclas,
  cta,
  titulo,
}: {
  capitulos: Capitulo[];
  anclas: number[];
  cta: ReactNode;
  titulo: string;
}) {
  const n = capitulos.length;
  const pista = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const modo = useSyncExternalStore<Modo>(sinSuscripcion, calcularModo, () => "estatico");
  const [activo, setActivo] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [cargar, setCargar] = useState(false);

  // Descarga el video solo cuando la sección está cerca.
  useEffect(() => {
    if (modo !== "scrub" || !pista.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setCargar(true), { rootMargin: "900px 0px" });
    io.observe(pista.current);
    return () => io.disconnect();
  }, [modo]);

  // Scroll → capítulo activo y tiempo del video (con suavizado).
  useEffect(() => {
    if (modo !== "scrub") return;
    let objetivo = 0;
    let actual = 0;
    let raf = 0;
    let vivo = true;

    const leer = () => {
      const el = pista.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      const p = clamp(-r.top / total);
      setProgreso(p);
      setActivo((a) => {
        const i = Math.min(n - 1, Math.floor(p * n));
        return i === a ? a : i;
      });
      // Interpolación entre anclas situadas en el centro de cada capítulo.
      const centros = anclas.map((_, i) => (i + 0.5) / n);
      let f = anclas[0];
      if (p >= centros[n - 1]) f = anclas[n - 1];
      else if (p > centros[0]) {
        const k = centros.findIndex((c) => c >= p);
        const t = (p - centros[k - 1]) / (centros[k] - centros[k - 1]);
        f = anclas[k - 1] + (anclas[k] - anclas[k - 1]) * t;
      }
      objetivo = f;
    };

    const ciclo = () => {
      if (!vivo) return;
      const v = video.current;
      if (v && v.readyState >= 2 && Number.isFinite(v.duration) && v.duration > 0) {
        actual += (objetivo - actual) * 0.18;
        const t = actual * v.duration;
        if (!v.seeking && Math.abs(v.currentTime - t) > 0.02) v.currentTime = t;
      }
      raf = requestAnimationFrame(ciclo);
    };

    leer();
    window.addEventListener("scroll", leer, { passive: true });
    window.addEventListener("resize", leer);
    raf = requestAnimationFrame(ciclo);
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", leer);
      window.removeEventListener("resize", leer);
    };
  }, [modo, n, anclas]);

  const scrub = modo === "scrub";

  return (
    <section
      id="historia"
      aria-labelledby="historia-t"
      className="ml-historia"
      data-modo={modo}
      style={{ ["--n" as string]: n }}
    >
      <h2 id="historia-t" className="sr-only">
        {titulo}
      </h2>

      {scrub ? (
        // Texto completo para lectores de pantalla; el escenario visual va oculto para ellos.
        <ol className="sr-only">
          {capitulos.map((c) => (
            <li key={c.clave}>
              {c.chip ? `${c.chip}. ` : ""}
              {c.titulo}. {c.texto} {c.nota ?? ""}
            </li>
          ))}
        </ol>
      ) : null}

      <div ref={pista} className="ml-historia-pista">
        <div className="ml-historia-escenario" aria-hidden={scrub ? true : undefined}>
          <div className="ml-historia-visual">
            <picture>
              <source type="image/avif" srcSet={`${BASE}/escena-poster.avif`} />
              <source type="image/webp" srcSet={`${BASE}/escena-poster.webp`} />
              <img src={`${BASE}/escena-poster.webp`} width={1170} height={600} alt="" loading="lazy" decoding="async" />
            </picture>
            {scrub && cargar ? (
              <video ref={video} className="ml-historia-video" muted playsInline preload="auto" tabIndex={-1}>
                <source src={`${BASE}/escena.webm`} type="video/webm" />
              </video>
            ) : null}
          </div>

          <div className="ml-historia-textos">
            {capitulos.map((c, i) => {
              const ultimo = i === n - 1;
              const visible = !scrub || i === activo;
              return (
                <article
                  key={c.clave}
                  className="ml-capitulo"
                  data-activo={visible}
                  inert={scrub && !visible ? true : undefined}
                >
                  {c.chip ? <span className="mia-chip mia-chip-ok">{c.chip}</span> : null}
                  <h3>{c.titulo}</h3>
                  <p className="ml-capitulo-texto">{c.texto}</p>
                  {c.nota ? <p className="ml-capitulo-nota">{c.nota}</p> : null}
                  {ultimo ? <div className="ml-capitulo-cta">{cta}</div> : null}
                </article>
              );
            })}
          </div>

          {scrub ? (
            <div className="ml-historia-progreso" aria-hidden="true">
              {capitulos.map((c, i) => (
                <span key={c.clave} data-on={i <= activo} />
              ))}
              <i style={{ transform: `scaleX(${progreso})` }} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
