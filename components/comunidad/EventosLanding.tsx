"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { track } from "@vercel/analytics";

/**
 * Eventos de la landing, sin datos personales ni tokens: solo el nombre del evento y el programa. Los de
 * conversión (cuenta verificada, asesor solicitado, checkout creado, pago confirmado) se disparan en el
 * SERVIDOR tras éxito real; nunca al abrir «gracias».
 */

export function VistaLanding({ programa }: { programa: string }) {
  const enviado = useRef(false);
  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    track("landing_view", { programa });
  }, [programa]);
  return null;
}

/** Enlace que registra el interés en un programa (intención explícita) antes de ir a crear la cuenta. */
export function EnlaceInteres({ programa, ...props }: ComponentProps<"a"> & { programa: string }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track("product_interest", { programa });
        props.onClick?.(e);
      }}
    />
  );
}
