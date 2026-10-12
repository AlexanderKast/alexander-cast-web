"use client";

import { useActionState, useRef } from "react";
import { crearAlumno } from "@/app/comunidad/actions";
import { ENTRADAS, ENTRADA_LABEL } from "@/lib/comunidad/validators";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

interface Props {
  cohortes: { id: string; nombre: string }[];
}

/**
 * Alta de un alumno en el stand: 3 campos a escribir (nombre, correo, WhatsApp),
 * la entrada es un toque, y al guardar el formulario queda limpio para el siguiente.
 */
export function FormAlumno({ cohortes }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  const [estado, accion, pendiente] = useActionState(
    async (prev: typeof INICIAL, fd: FormData) => {
      const r = await crearAlumno(prev, fd);
      if (r.status === "ok") {
        ref.current?.reset();
        ref.current?.querySelector<HTMLInputElement>("input[name=nombre]")?.focus();
      }
      return r;
    },
    INICIAL,
  );
  const errores = estado.status === "error" ? (estado.fieldErrors ?? {}) : {};

  return (
    <form ref={ref} action={accion} className="space-y-4">
      <Campo etiqueta="Nombre" error={errores.nombre}>
        <input name="nombre" required autoComplete="off" autoCapitalize="words" className={inputCls} />
      </Campo>
      <Campo etiqueta="Correo" error={errores.email}>
        <input
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="off"
          autoCapitalize="none"
          className={inputCls}
        />
      </Campo>
      <Campo etiqueta="WhatsApp (opcional)" error={errores.whatsapp}>
        <input name="whatsapp" type="tel" inputMode="tel" autoComplete="off" className={inputCls} />
      </Campo>

      <fieldset>
        <legend className="mia-label">
          Entrada
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {ENTRADAS.map((e, i) => (
            <label key={e} className="cursor-pointer">
              <input
                type="radio"
                name="entrada"
                value={e}
                defaultChecked={i === 0}
                className="sr-only"
              />
              <span className="mia-choice">
                {ENTRADA_LABEL[e]}
              </span>
            </label>
          ))}
        </div>
        {errores.entrada ? <p className="mia-error">{errores.entrada}</p> : null}
      </fieldset>

      {cohortes.length > 1 ? (
        <Campo etiqueta="Cohorte" error={errores.cohorte_id}>
          <select name="cohorte_id" defaultValue={cohortes[0].id} className={inputCls}>
            {cohortes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
      ) : (
        <input type="hidden" name="cohorte_id" value={cohortes[0]?.id ?? ""} />
      )}

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="enviar" defaultChecked className="size-5 accent-[#65a30d]" />
        Enviar el acceso por correo ahora
      </label>

      <button type="submit" disabled={pendiente} className={botonCls + " mia-btn-block"}>
        {pendiente ? "Guardando…" : "Dar de alta"}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
