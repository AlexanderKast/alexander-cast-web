"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { botonCls } from "./ui";

type Estado = "pendiente" | "pagado" | "fallido" | "abandonado" | "reembolsado" | "disputa" | "revision" | "desconocido";

/**
 * Pantalla de «gracias». NO marca nada como pagado: solo consulta el estado
 * que fijó el webhook de Stripe y lo refresca cada pocos segundos.
 */
export function EstadoPago({ pedidoId }: { pedidoId: string }) {
  const [estado, setEstado] = useState<Estado>("pendiente");
  const [listo, setListo] = useState(false);
  const [intentos, setIntentos] = useState(0);

  useEffect(() => {
    if (listo || intentos >= 40) return; // ~2 minutos
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/comunidad/pedido/${pedidoId}`, { cache: "no-store" });
        const j = (await r.json()) as { estado: Estado; listo?: boolean };
        setEstado(j.estado);
        setListo(j.listo === true);
      } catch {
        /* se reintenta en el siguiente ciclo */
      }
      setIntentos((n) => n + 1);
    }, intentos === 0 ? 800 : 3000);
    return () => clearTimeout(id);
  }, [pedidoId, listo, intentos]);

  if (listo) {
    return (
      <div className="space-y-4">
        <h1 className="mia-title">¡Estás dentro!</h1>
        <p className="mia-lead">
          Recibimos tu pago y creamos tu cuenta. Te enviamos el acceso a tu correo: toca el botón del mensaje
          (revisa también el spam).
        </p>
        <Link href="/comunidad/login" className={botonCls}>
          Ir a entrar
        </Link>
      </div>
    );
  }

  if (estado === "fallido" || estado === "abandonado") {
    return (
      <div className="space-y-4">
        <h1 className="mia-title">El pago no se completó</h1>
        <p className="mia-lead">No te cobramos nada. Puedes intentarlo de nuevo cuando quieras.</p>
        <Link href="/comunidad/unete" className={botonCls}>
          Volver a intentar
        </Link>
      </div>
    );
  }

  if (estado === "revision" || estado === "disputa" || estado === "reembolsado") {
    return (
      <div className="space-y-4">
        <h1 className="mia-title">Estamos revisando tu pago</h1>
        <p className="mia-lead">Te escribiremos por WhatsApp o correo en cuanto lo confirmemos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="mia-title">Confirmando tu pago…</h1>
      <p className="mia-lead">
        Esto toma unos segundos. No cierres esta pantalla.
        {intentos >= 40 ? " Está tardando más de lo normal: tranquilo, si pagaste recibirás tu acceso por correo." : ""}
      </p>
      <div aria-hidden="true" className="h-1.5 w-48 overflow-hidden rounded-full bg-[var(--mia-surface)]">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--mia-accent)]" />
      </div>
    </div>
  );
}
