"use client";

import { useActionState } from "react";
import { solicitarAcceso } from "@/app/comunidad/actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

export function FormAcceso() {
  const [estado, accion, pendiente] = useActionState(solicitarAcceso, INICIAL);

  return (
    <form action={accion} className="space-y-4">
      <Campo etiqueta="Tu correo">
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
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
        {pendiente ? "Enviando…" : "Enviarme el enlace de acceso"}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
