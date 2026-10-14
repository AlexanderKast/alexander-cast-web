"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * CTA fijo en móvil. Solo aparece cuando el CTA principal del hero ya salió de pantalla y se oculta al llegar al
 * bloque de ofertas o al cierre (donde ya hay un CTA a la vista), para no duplicarse ni tapar contenido.
 * Respeta las zonas seguras del dispositivo. En escritorio no se muestra.
 */
export function CtaFijoMovil({ children, ocultarEn }: { children: ReactNode; ocultarEn: string[] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("cta-principal");
    if (!hero) return;
    let heroVisible = true;
    const otros = new Set<string>();
    const recalcular = () => setVisible(!heroVisible && otros.size === 0);

    const ioHero = new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      recalcular();
    });
    ioHero.observe(hero);

    const ioOtros = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) otros.add(e.target.id);
        else otros.delete(e.target.id);
      }
      recalcular();
    });
    for (const id of ocultarEn) {
      const el = document.getElementById(id);
      if (el) ioOtros.observe(el);
    }
    return () => {
      ioHero.disconnect();
      ioOtros.disconnect();
    };
  }, [ocultarEn]);

  return (
    // inert: oculto, ni recibe foco ni lo leen los lectores de pantalla.
    <div className="ml-cta-fijo" data-visible={visible} inert={!visible}>
      {children}
    </div>
  );
}
