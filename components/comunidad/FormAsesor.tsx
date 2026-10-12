"use client";

import { useActionState } from "react";
import { solicitarAsesor, type EstadoAsesor } from "@/app/comunidad/programa-actions";
import { botonSecundarioCls } from "./ui";

const INICIAL: EstadoAsesor = { status: "idle" };

/**
 * Pedir que un asesor te contacte. Es una intención EXPLÍCITA y por canal: autorizas que te contacten por ese
 * canal sobre este programa; no equivale a aceptar campañas. No crea un pedido, no reserva cupo y no da acceso.
 */
export function FormAsesor({
  programa,
  ofertaId,
  tieneWhatsapp,
}: {
  programa: string;
  ofertaId?: string | null;
  tieneWhatsapp: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(solicitarAsesor, INICIAL);

  if (estado.status === "ok") {
    return (
      <p role="status" className="mia-alert mia-alert-ok">
        Recibimos tu solicitud. Un asesor te contactará por el canal que elegiste. Esto no es una compra ni reserva un
        cupo.
      </p>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="programa" value={programa} />
      {ofertaId ? <input type="hidden" name="oferta" value={ofertaId} /> : null}

      <fieldset>
        <legend className="mia-label">¿Cómo prefieres que te contacten?</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="cursor-pointer">
            <input type="radio" name="canal" value="whatsapp" defaultChecked={tieneWhatsapp} className="sr-only" />
            <span className="mia-choice">WhatsApp</span>
          </label>
          <label className="cursor-pointer">
            <input type="radio" name="canal" value="correo" defaultChecked={!tieneWhatsapp} className="sr-only" />
            <span className="mia-choice">Correo</span>
          </label>
        </div>
        {!tieneWhatsapp ? (
          <p className="mia-muted mt-2 text-xs">Para WhatsApp agrega tu número en «Mi cuenta».</p>
        ) : null}
      </fieldset>

      <label className="flex items-start gap-3 text-sm leading-snug">
        <input type="checkbox" name="consentimiento" required className="mt-0.5 size-5 shrink-0 accent-[#65a30d]" />
        <span>Autorizo que un asesor me contacte por el canal elegido para hablar de este programa.</span>
      </label>

      <button type="submit" disabled={pendiente} className={botonSecundarioCls + " mia-btn-block"}>
        {pendiente ? "Enviando…" : "Quiero que me asesoren"}
      </button>
      {estado.status === "error" ? (
        <p role="alert" className="mia-alert mia-alert-error">
          {estado.message}
        </p>
      ) : null}
    </form>
  );
}
