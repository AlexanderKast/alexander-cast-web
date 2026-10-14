"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { track } from "@vercel/analytics";

/**
 * Eventos de la landing, sin datos personales ni tokens: solo el nombre del evento, el programa, la variante de
 * landing y la posición del CTA. Los de conversión (cuenta verificada, asesor solicitado, checkout creado, pago
 * confirmado) se disparan en el SERVIDOR tras éxito real; nunca al abrir «gracias». Un clic NO es un lead.
 */

type Variante = "venta" | "asesoria";

export function VistaLanding({ programa, variante = "venta" }: { programa: string; variante?: Variante }) {
  const enviado = useRef(false);
  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    track("landing_view", { product_id: programa, landing_variant: variante });
  }, [programa, variante]);
  return null;
}

/**
 * Enlace que registra el clic en un CTA (intención, no conversión) antes de ir a crear la cuenta.
 * `posicion` identifica dónde estaba el CTA (hero, entregables, ofertas, cierre, sticky...).
 */
export function EnlaceInteres({
  programa,
  variante = "venta",
  posicion = "otro",
  ...props
}: ComponentProps<"a"> & { programa: string; variante?: Variante; posicion?: string }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(variante === "asesoria" ? "advisor_cta_click" : "primary_cta_click", {
          product_id: programa,
          landing_variant: variante,
          cta_position: posicion,
        });
        props.onClick?.(e);
      }}
    />
  );
}

/** Evento de embudo que se dispara una sola vez al montar (p. ej. internal_product_view). Sin datos personales. */
export function EventoUnaVez({ nombre, props }: { nombre: string; props: Record<string, string> }) {
  const enviado = useRef(false);
  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    track(nombre, props);
  }, [nombre, props]);
  return null;
}
