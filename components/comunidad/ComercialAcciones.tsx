"use client";

import { useActionState } from "react";
import {
  asignarAccion,
  cambiarEstadoAccion,
  notaAccion,
  ofertaAccion,
  pedidoAccion,
  type EstadoComercial,
} from "@/app/comunidad/comercial-actions";
import { Campo, botonCls, botonSecundarioCls, inputCls } from "./ui";

const INICIAL: EstadoComercial = { status: "idle" };

function Mensaje({ estado }: { estado: EstadoComercial }) {
  if (estado.status === "idle") return null;
  return (
    <div role={estado.status === "ok" ? "status" : "alert"} className={"mia-alert text-sm " + (estado.status === "ok" ? "mia-alert-ok" : "mia-alert-error")}>
      <p>{estado.message}</p>
      {estado.status === "ok" && estado.enlace ? (
        <p className="mt-2 break-all font-mono text-xs">{estado.enlace}</p>
      ) : null}
    </div>
  );
}

export function CambiarEstado({ id, destinos }: { id: string; destinos: { valor: string; etiqueta: string }[] }) {
  const [estado, accion, pendiente] = useActionState(cambiarEstadoAccion, INICIAL);
  if (!destinos.length) return null;
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="oportunidad" value={id} />
      <Campo etiqueta="Cambiar estado">
        <select name="estado" className={inputCls} defaultValue={destinos[0].valor}>
          {destinos.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.etiqueta}
            </option>
          ))}
        </select>
      </Campo>
      <button type="submit" disabled={pendiente} className={botonSecundarioCls}>
        {pendiente ? "Guardando…" : "Actualizar"}
      </button>
      <Mensaje estado={estado} />
    </form>
  );
}

export function Asignar({ id, opciones, actual }: { id: string; opciones: { userId: string; nombre: string }[]; actual: string | null }) {
  const [estado, accion, pendiente] = useActionState(asignarAccion, INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="oportunidad" value={id} />
      <Campo etiqueta="Asignar a">
        <select name="comercial" className={inputCls} defaultValue={actual ?? opciones[0]?.userId}>
          {opciones.map((o) => (
            <option key={o.userId} value={o.userId}>
              {o.nombre}
            </option>
          ))}
        </select>
      </Campo>
      <button type="submit" disabled={pendiente} className={botonSecundarioCls}>
        {pendiente ? "Asignando…" : "Asignar"}
      </button>
      <Mensaje estado={estado} />
    </form>
  );
}

export function FijarOferta({ id, ofertas, actual }: { id: string; ofertas: { id: string; etiqueta: string }[]; actual: string | null }) {
  const [estado, accion, pendiente] = useActionState(ofertaAccion, INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="oportunidad" value={id} />
      <Campo etiqueta="Oferta que se le propone">
        <select name="oferta" className={inputCls} defaultValue={actual ?? ofertas[0]?.id}>
          {ofertas.map((o) => (
            <option key={o.id} value={o.id}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </Campo>
      <button type="submit" disabled={pendiente} className={botonSecundarioCls}>
        {pendiente ? "Guardando…" : "Guardar oferta"}
      </button>
      <Mensaje estado={estado} />
    </form>
  );
}

export function NuevaNota({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState(notaAccion, INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="oportunidad" value={id} />
      <Campo etiqueta="Nota interna (el cliente no la ve)">
        <textarea name="texto" required maxLength={2000} className={inputCls} />
      </Campo>
      <button type="submit" disabled={pendiente} className={botonSecundarioCls}>
        {pendiente ? "Guardando…" : "Agregar nota"}
      </button>
      <Mensaje estado={estado} />
    </form>
  );
}

export function GenerarPedido({ id, habilitado }: { id: string; habilitado: boolean }) {
  const [estado, accion, pendiente] = useActionState(pedidoAccion, INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="oportunidad" value={id} />
      <button type="submit" disabled={pendiente || !habilitado} className={botonCls}>
        {pendiente ? "Creando…" : "Crear pedido para el cliente"}
      </button>
      {!habilitado ? <p className="mia-muted text-xs">Primero elige la oferta que se le propone.</p> : null}
      <Mensaje estado={estado} />
    </form>
  );
}
