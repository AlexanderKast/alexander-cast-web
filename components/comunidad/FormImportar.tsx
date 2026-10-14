"use client";

import { useActionState } from "react";
import { importarAlumnos } from "@/app/comunidad/actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

export function FormImportar({ productos }: { productos: { id: string; nombre: string }[] }) {
  const [estado, accion, pendiente] = useActionState(importarAlumnos, INICIAL);

  return (
    <form action={accion} className="space-y-4">
      <Campo etiqueta="Programa">
        <select name="producto_id" required defaultValue={productos[0]?.id} className={inputCls}>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Archivo CSV">
        <input
          type="file"
          name="archivo"
          accept=".csv,text/csv"
          required
          className={inputCls + " file:mr-4 file:rounded-full file:border-0 file:bg-[#ecfccb] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#3f6212]"}
        />
      </Campo>
      <button type="submit" disabled={pendiente} className={botonCls + " mia-btn-block sm:w-auto"}>
        {pendiente ? "Importando…" : "Importar y dar acceso"}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
