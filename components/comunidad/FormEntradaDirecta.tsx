"use client";

import { useActionState } from "react";
import { entradaDirecta } from "@/app/comunidad/dev-actions";
import { Aviso, Campo, INICIAL, botonSecundarioCls, inputCls } from "./ui";

/** Solo se renderiza en desarrollo (la página lo decide). */
export function FormEntradaDirecta() {
  const [estado, accion, pendiente] = useActionState(entradaDirecta, INICIAL);
  return (
    <form action={accion} className="space-y-3">
      <Campo etiqueta="Correo">
        <input
          name="email"
          type="email"
          inputMode="email"
          required
          placeholder="tu@correo.com"
          className={inputCls}
        />
      </Campo>
      <button type="submit" disabled={pendiente} className={botonSecundarioCls + " mia-btn-block"}>
        {pendiente ? "Entrando…" : "Entrar directo"}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
