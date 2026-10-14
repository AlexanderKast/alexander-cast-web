/**
 * Decisión sobre un pago (lógica pura, sin IO). Adaptada del contrato de
 * pagos de Imperio CRM: lo que no se puede verificar va a revisión; nunca se
 * acepta por omisión.
 */

export type EstadoPedido =
  | "pendiente"
  | "pagado"
  | "fallido"
  | "abandonado"
  | "reembolsado"
  | "disputa"
  | "revision";

export interface PedidoEsperado {
  id: string;
  estado: EstadoPedido;
  montoCentavos: number;
  moneda: string;
  paymentIntent: string | null;
}

/** Pago normalizado desde Stripe (o desde el simulador, que usa el mismo camino). */
export interface PagoNormalizado {
  sessionId: string;
  paymentIntent: string | null;
  estado: "paid" | "unpaid" | "no_payment_required" | "unknown";
  montoCentavos: number | null;
  moneda: string | null;
  pedidoId: string | null;
}

export type DecisionPago =
  | { accion: "aplicar"; pedidoId: string }
  | { accion: "duplicado"; pedidoId: string }
  | { accion: "pago_extra"; pedidoId: string }
  | { accion: "revision"; pedidoId: string; motivo: string }
  | { accion: "sin_pedido"; motivo: string }
  | { accion: "esperar"; motivo: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function pedidoIdValido(valor: unknown): string | null {
  return typeof valor === "string" && UUID.test(valor) ? valor.toLowerCase() : null;
}

export function decidirPago(pago: PagoNormalizado, pedido: PedidoEsperado | null): DecisionPago {
  if (!pago.pedidoId) return { accion: "sin_pedido", motivo: "metadata_sin_pedido" };
  if (!pedido) return { accion: "sin_pedido", motivo: "pedido_inexistente" };

  // Solo 'paid' mueve dinero. Pagos asíncronos (p. ej. transferencias) llegan 'unpaid' y se esperan.
  if (pago.estado === "unpaid") return { accion: "esperar", motivo: "pago_no_confirmado" };
  if (pago.estado !== "paid") {
    return { accion: "revision", pedidoId: pedido.id, motivo: `estado_${pago.estado}` };
  }

  if (pedido.estado === "pagado") {
    return pedido.paymentIntent && pago.paymentIntent === pedido.paymentIntent
      ? { accion: "duplicado", pedidoId: pedido.id }
      : { accion: "pago_extra", pedidoId: pedido.id };
  }

  if (pago.montoCentavos === null) return { accion: "revision", pedidoId: pedido.id, motivo: "monto_ausente" };
  if (!pago.moneda) return { accion: "revision", pedidoId: pedido.id, motivo: "moneda_ausente" };
  if (pago.moneda.toLowerCase() !== pedido.moneda.toLowerCase()) {
    return { accion: "revision", pedidoId: pedido.id, motivo: "moneda_distinta" };
  }
  if (pago.montoCentavos !== pedido.montoCentavos) {
    return { accion: "revision", pedidoId: pedido.id, motivo: "monto_distinto" };
  }
  return { accion: "aplicar", pedidoId: pedido.id };
}

/** Estados desde los que un pago confirmado SÍ puede aplicarse (nunca desde reembolsado/disputa). */
export const ESTADOS_PAGABLES: EstadoPedido[] = ["pendiente", "abandonado", "fallido", "revision"];
