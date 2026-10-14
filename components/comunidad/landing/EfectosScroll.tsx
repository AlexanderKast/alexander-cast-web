"use client";

import { useEffect } from "react";

/**
 * Efectos de scroll de la landing, montados una sola vez:
 *  - Aparición progresiva de todo elemento con `data-reveal` (con escalonado por `--i`).
 *  - Cuenta animada de las cifras con `data-contar="8"` (acepta decimales con coma: data-decimales="1").
 *  - Barra de progreso de lectura (CSS puro, ver landing.css).
 * Con «reducir movimiento» todo queda visible y las cifras muestran su valor final. Sin JS la página se ve completa:
 * el ocultado inicial solo se activa cuando este componente ya está en marcha.
 */
export function EfectosScroll({ raiz = ".ml-landing" }: { raiz?: string }) {
  useEffect(() => {
    const cont = document.querySelector<HTMLElement>(raiz);
    if (!cont) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fmt = (v: number, dec: number) => v.toFixed(dec).replace(".", ",");
    const cifras = Array.from(cont.querySelectorAll<HTMLElement>("[data-contar]"));
    const poner = (el: HTMLElement, v: number) => (el.textContent = fmt(v, Number(el.dataset.decimales ?? 0)));
    const contar = (el: HTMLElement) => {
      const meta = Number(el.dataset.contar);
      const t0 = performance.now();
      const dur = 900;
      const paso = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        poner(el, meta * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };

    if (reducir) {
      cifras.forEach((el) => poner(el, Number(el.dataset.contar)));
      return;
    }

    const objetivos = Array.from(cont.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.setAttribute("data-in", "");
          if (el.dataset.contar) contar(el);
          io.unobserve(el);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    cifras.forEach((el) => poner(el, 0));
    // Lo que ya está en pantalla se marca antes de activar el ocultado: sin parpadeo.
    for (const el of [...objetivos, ...cifras]) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
        el.setAttribute("data-in", "");
        if (el.dataset.contar) contar(el);
      } else io.observe(el);
    }
    cont.setAttribute("data-js", "");
    return () => {
      io.disconnect();
      cont.removeAttribute("data-js");
    };
  }, [raiz]);

  return <div className="ml-progreso-lectura" aria-hidden="true" />;
}
