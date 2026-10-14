"use client";

import { useActionState, useRef } from "react";
import { crearAlumno } from "@/app/comunidad/actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

interface OpcionOferta {
  id: string;
  etiqueta: string;
}

/**
 * ALTA MANUAL (admin). Concede un derecho de acceso: NO es una venta. Exige un motivo o referencia (queda
 * auditado junto con quién la hizo) y permite marcarla como cortesía, que es una concesión distinta de una compra.
 */
export function FormAlumno({ ofertas }: { ofertas: OpcionOferta[] }) {
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
        <input name="email" type="email" inputMode="email" required autoComplete="off" autoCapitalize="none" className={inputCls} />
      </Campo>
      <Campo etiqueta="WhatsApp (opcional)" error={errores.whatsapp}>
        <input name="whatsapp" type="tel" inputMode="tel" autoComplete="off" className={inputCls} />
      </Campo>
      <Campo etiqueta="Programa y entrada" error={errores.oferta_id}>
        <select name="oferta_id" required defaultValue={ofertas[0]?.id} className={inputCls}>
          {ofertas.map((o) => (
            <option key={o.id} value={o.id}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Motivo o referencia (queda registrado)" error={errores.motivo}>
        <input
          name="motivo"
          required
          maxLength={300}
          placeholder="Ej.: pago en datáfono, stand, ref. 1234"
          className={inputCls}
        />
      </Campo>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="tipo" value="cortesia" className="size-5 accent-[#65a30d]" />
        Es una cortesía (no hay una venta detrás)
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="enviar" defaultChecked className="size-5 accent-[#65a30d]" />
        Enviar el acceso por correo ahora
      </label>

      <button type="submit" disabled={pendiente} className={botonCls + " mia-btn-block"}>
        {pendiente ? "Guardando…" : "Dar acceso"}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
