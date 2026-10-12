"use client";

import { useActionState } from "react";
import { importarAlumnos } from "@/app/comunidad/actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

export function FormImportar({ cohortes }: { cohortes: { id: string; nombre: string }[] }) {
  const [estado, accion, pendiente] = useActionState(importarAlumnos, INICIAL);

  return (
    <form action={accion} className="space-y-4">
      <Campo etiqueta="Archivo CSV">
        <input
          type="file"
          name="archivo"
          accept=".csv,text/csv"
          required
          className={inputCls + " file:mr-4 file:rounded-full file:border-0 file:bg-[#ecfccb] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#3f6212]"}
        />
      </Campo>
      {cohortes.length > 1 ? (
        <Campo etiqueta="Cohorte por defecto (si el CSV no trae la columna)">
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
      <button type="submit" disabled={pendiente} className={botonCls}>
        {pendiente ? "Importando…" : "Importar alumnos"}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
