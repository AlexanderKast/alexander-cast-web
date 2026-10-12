"use server";

import { redirect } from "next/navigation";
import { marcarNoPagado, obtenerPedido, procesarPago } from "@/lib/comunidad/pedidos";
import { pedidoIdValido } from "@/lib/comunidad/pagos";
import { simuladorActivo } from "@/lib/comunidad/stripe";

/**
 * Simulador de pago (solo desarrollo y solo si Stripe NO está configurado).
 * Recorre el MISMO camino que el webhook real: procesarPago → decidirPago →
 * aprovisionar. Se apaga solo cuando existe STRIPE_SECRET_KEY.
 */
export async function simularPago(fd: FormData): Promise<void> {
  if (!simuladorActivo()) return;
  const id = pedidoIdValido(fd.get("pedido"));
  const caso = String(fd.get("caso") ?? "");
  const pedido = id ? await obtenerPedido(id) : null;
  if (!id || !pedido) return;

  if (caso === "fallido" || caso === "abandonado") {
    await marcarNoPagado(id, caso);
  } else {
    await procesarPago({
      sessionId: `sim_cs_${id}`,
      paymentIntent: `sim_pi_${id}`,
      estado: "paid",
      // «monto_distinto» prueba la defensa: debe ir a revisión, no aplicarse.
      montoCentavos: caso === "monto_distinto" ? 100 : pedido.montoCentavos,
      moneda: pedido.moneda,
      pedidoId: id,
    });
  }
  redirect(`/comunidad/gracias?p=${id}`);
}
