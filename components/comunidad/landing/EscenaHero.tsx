"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Escena del hero: tres módulos (web, app y herramienta) generados con Magnific y animados en video SIN FONDO
 * (WebM VP9 con alfa), así que se funden con el marfil de la página. Primero se pinta el poster (también con alfa);
 * el video entra con un fundido, se reproduce una vez al aparecer y se queda en el último fotograma.
 *
 * Carga segura: no se descarga con «reducir movimiento» ni «ahorro de datos», ni en navegadores que no leen
 * WebM con alfa (Safari): ahí la escena es el poster. Es decorativo (aria-hidden); el titular y el CTA son HTML.
 */
const BASE = "/comunidad/landing";

/** ¿El navegador reproduce WebM VP9 con alfa? (Safari no: se queda con el poster.) */
export function soportaWebmAlfa(): boolean {
  if (typeof document === "undefined") return false;
  const esSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  if (esSafari) return false;
  return document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "";
}

export function EscenaHero() {
  const ref = useRef<HTMLVideoElement>(null);
  const [cargar, setCargar] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reducir || conn?.saveData || !soportaWebmAlfa()) return;
    // Después del primer pintado: el video nunca compite con el poster por el LCP.
    const id = window.setTimeout(() => setCargar(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!cargar || !v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [cargar]);

  return (
    <div className="ml-escena" aria-hidden="true">
      <picture>
        <source type="image/avif" srcSet={`${BASE}/escena-poster.avif`} />
        <source type="image/webp" srcSet={`${BASE}/escena-poster.webp`} />
        {/* Poster = estado final con alfa. Único recurso prioritario de la página. */}
        <img
          src={`${BASE}/escena-poster.webp`}
          width={1280}
          height={720}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="ml-escena-img"
        />
      </picture>
      {cargar ? (
        <video
          ref={ref}
          className="ml-escena-video"
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          data-on={reproduciendo}
          onPlaying={() => setReproduciendo(true)}
        >
          <source src={`${BASE}/escena.webm`} type="video/webm" />
        </video>
      ) : null}
    </div>
  );
}
