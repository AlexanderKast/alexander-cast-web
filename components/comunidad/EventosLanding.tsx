"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { track } from "@vercel/analytics";

/**
 * Eventos de la landing, sin datos personales ni tokens: solo el nombre del
 * evento y, a lo sumo, el nivel. Los de conversión (lead guardado, checkout
 * creado, pago confirmado) se disparan tras éxito REAL del servidor, no aquí.
 */

export function VistaLanding() {
  const enviado = useRef(false);
  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    track("landing_view");
  }, []);
  return null;
}

/** Enlace a la zona de entradas/compra que registra la intención explícita de comprar. */
export function EnlaceCompra({ nivel, ...props }: ComponentProps<"a"> & { nivel?: string }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track("purchase_cta_click", nivel ? { nivel } : undefined);
        props.onClick?.(e);
      }}
    />
  );
}
