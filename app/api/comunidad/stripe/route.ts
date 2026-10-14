import { NextResponse, type NextRequest } from "next/server";
import { claveStripe, getStripe, secretoWebhookStripe } from "@/lib/comunidad/stripe";
import { procesarEventoStripe } from "@/lib/comunidad/pedidos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Stripe para Master IA 360.
 * URL: https://<dominio>/api/comunidad/stripe
 * Eventos: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired,
 * charge.refunded, charge.dispute.created.
 *
 * La firma se verifica sobre el cuerpo CRUDO; sin firma válida no se procesa nada.
 * Si el procesamiento falla se responde 500 para que Stripe reintente (el
 * evento queda registrado y se reprocesa; el aprovisionamiento es idempotente).
 */
export async function POST(req: NextRequest) {
  const secreto = secretoWebhookStripe();
  if (!secreto || !claveStripe()) {
    return NextResponse.json({ error: "webhook_no_configurado" }, { status: 503 });
  }

  const firma = req.headers.get("stripe-signature");
  if (!firma) return NextResponse.json({ error: "sin_firma" }, { status: 400 });

  const cuerpo = await req.text();
  let evento;
  try {
    evento = getStripe().webhooks.constructEvent(cuerpo, firma, secreto);
  } catch {
    return NextResponse.json({ error: "firma_invalida" }, { status: 400 });
  }

  try {
    const resultado = await procesarEventoStripe(evento);
    return NextResponse.json({ received: true, resultado });
  } catch (e) {
    console.error("[comunidad] error procesando evento de Stripe:", evento.id, evento.type, e);
    return NextResponse.json({ error: "error_procesando" }, { status: 500 });
  }
}
