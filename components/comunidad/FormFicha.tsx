"use client";

import { useActionState } from "react";
import { guardarFicha } from "@/app/comunidad/actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

interface Props {
  inicial: { vende: string; a_quien: string; quiere: string } | null;
  bloqueada: boolean;
}

const areaCls = inputCls + " min-h-32 resize-y";

export function FormFicha({ inicial, bloqueada }: Props) {
  const [estado, accion, pendiente] = useActionState(guardarFicha, INICIAL);
  const errores = estado.status === "error" ? (estado.fieldErrors ?? {}) : {};

  return (
    <form action={accion} className="space-y-5">
      <fieldset disabled={bloqueada} className="space-y-5 disabled:opacity-70">
        <Campo etiqueta="¿Qué vende tu negocio?" error={errores.vende}>
          <textarea
            name="vende"
            required
            maxLength={1000}
            defaultValue={inicial?.vende}
            placeholder="Productos o servicios, en pocas palabras"
            className={areaCls}
          />
        </Campo>
        <Campo etiqueta="¿A quién le vende?" error={errores.a_quien}>
          <textarea
            name="a_quien"
            required
            maxLength={1000}
            defaultValue={inicial?.a_quien}
            placeholder="Tu cliente ideal"
            className={areaCls}
          />
        </Campo>
        <Campo etiqueta="¿Qué te gustaría tener? (web, app o herramienta)" error={errores.quiere}>
          <textarea
            name="quiere"
            required
            maxLength={1000}
            defaultValue={inicial?.quiere}
            placeholder="Lo que más le ayudaría a tu negocio"
            className={areaCls}
          />
        </Campo>
      </fieldset>

      {bloqueada ? (
        <p className="rounded-xl border border-line-strong px-4 py-3 text-sm text-muted-foreground">
          La clase 1 ya empezó: la ficha quedó cerrada y ya no se puede editar.
        </p>
      ) : (
        <button type="submit" disabled={pendiente} className={botonCls + " w-full sm:w-auto"}>
          {pendiente ? "Guardando…" : inicial ? "Actualizar ficha" : "Guardar ficha"}
        </button>
      )}
      <Aviso estado={estado} />
    </form>
  );
}
