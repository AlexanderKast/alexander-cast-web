"use client";

import { useActionState } from "react";
import { solicitarAccesoPortal } from "@/app/actions/portal";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "@/components/comunidad/ui";

/** Pide el enlace mágico al portal de clientes de IMT (tema de la comunidad). */
export function FormAccesoPortal() {
  const [estado, accion, pendiente] = useActionState(solicitarAccesoPortal, INICIAL);

  return (
    <form action={accion} className="space-y-4">
      <Campo etiqueta="Tu correo">
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="tu@empresa.com"
          className={inputCls}
        />
      </Campo>
      {/* Honeypot: oculto para personas, los bots lo llenan. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <button type="submit" disabled={pendiente} className={botonCls + " mia-btn-block"}>
        {pendiente ? "Enviando…" : "Enviarme el enlace"}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
