"use client";

import { useActionState } from "react";
import { iniciarCompra, pagarPedido, type EstadoCompra } from "@/app/comunidad/programa-actions";
import { botonCls } from "./ui";

const INICIAL: EstadoCompra = { status: "idle" };

/** Comprar o continuar la compra de una oferta. Solo envía el id de la oferta; precio y cupos los valida el servidor. */
export function BotonComprar({ ofertaId, etiqueta }: { ofertaId: string; etiqueta: string }) {
  const [estado, accion, pendiente] = useActionState(iniciarCompra, INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="oferta" value={ofertaId} />
      <button type="submit" disabled={pendiente} className={botonCls + " mia-btn-block"}>
        {pendiente ? "Llevándote al pago…" : etiqueta}
      </button>
      {estado.status === "error" ? (
        <p role="alert" className="mia-alert mia-alert-error">
          {estado.message}
        </p>
      ) : null}
    </form>
  );
}

/** Pagar un pedido que ya existe en la cuenta (p. ej. el que creó un asesor). */
export function BotonPagarPedido({ pedidoId, etiqueta }: { pedidoId: string; etiqueta: string }) {
  const [estado, accion, pendiente] = useActionState(pagarPedido, INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="pedido" value={pedidoId} />
      <button type="submit" disabled={pendiente} className={botonCls + " mia-btn-block"}>
        {pendiente ? "Llevándote al pago…" : etiqueta}
      </button>
      {estado.status === "error" ? (
        <p role="alert" className="mia-alert mia-alert-error">
          {estado.message}
        </p>
      ) : null}
    </form>
  );
}
