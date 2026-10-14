import { NextResponse, type NextRequest } from "next/server";
import { procesarEventoImt } from "@/lib/imt/pedidos";
import { baseUrl } from "@/lib/comunidad/url";
import { origenPublico } from "@/lib/imt/origen";
import { getImtStripe, imtWebhookSecret } from "@/lib/imt/stripe";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Stripe para los planes de IA Master Tech.
 * URL: https://<dominio>/api/imt/stripe
 * Eventos: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired,
 * invoice.paid, invoice.payment_failed, customer.subscription.deleted,
 * charge.refunded.
 *
 * La firma se verifica sobre el cuerpo CRUDO. Si el procesamiento falla se
 * responde 500 para que Stripe reintente: el evento queda guardado y los
 * manejadores son idempotentes.
 */
export async function POST(req: NextRequest) {
  const secreto = imtWebhookSecret();
  if (!secreto) return NextResponse.json({ error: "webhook_no_configurado" }, { status: 503 });

  const firma = req.headers.get("stripe-signature");
  if (!firma) return NextResponse.json({ error: "sin_firma" }, { status: 400 });

  const cuerpo = await req.text();
  let evento;
  try {
    evento = getImtStripe().webhooks.constructEvent(cuerpo, firma, secreto);
  } catch {
    return NextResponse.json({ error: "firma_invalida" }, { status: 400 });
  }

  try {
    const resultado = await procesarEventoImt(
      createSupabaseServiceRole(),
      evento,
      origenPublico(req.headers, baseUrl()),
    );
    return NextResponse.json({ received: true, resultado });
  } catch (e) {
    console.error("[imt-pagos] error procesando evento de Stripe:", evento.id, evento.type, e);
    return NextResponse.json({ error: "error_procesando" }, { status: 500 });
  }
}
