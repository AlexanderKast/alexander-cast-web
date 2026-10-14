import { NextResponse, type NextRequest } from "next/server";
import { checkoutSchema, COOKIE_REFERIDO } from "@/lib/imt/pagos";
import { crearCheckout, ErrorCheckout } from "@/lib/imt/pedidos";
import { imtStripeConfigurado } from "@/lib/imt/stripe";
import { baseUrl } from "@/lib/comunidad/url";
import { origenPublico } from "@/lib/imt/origen";
import { clientIp, emailLimiter, formLimiter } from "@/lib/rate-limit";
import { isSameOriginStrict } from "@/lib/same-origin";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inicia el pago de un plan de IA Master Tech.
 * Recibe plan, periodo y datos de contacto; el importe NUNCA viene del cliente.
 * Devuelve la URL de Stripe Checkout a la que hay que redirigir.
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginStrict(req.headers)) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }
  if (!imtStripeConfigurado()) {
    return NextResponse.json(
      { error: "El pago en línea aún no está disponible. Escríbenos por WhatsApp." },
      { status: 503 },
    );
  }

  const cuerpo = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(cuerpo);
  if (!parsed.success) {
    const campos: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const campo = String(issue.path[0] ?? "form");
      campos[campo] ??= issue.message;
    }
    return NextResponse.json({ error: "Revisa los campos marcados.", campos }, { status: 400 });
  }

  const ip = clientIp(req.headers);
  if (!(await formLimiter(`pay:ip:${ip}`)).success) {
    return NextResponse.json({ error: "Muchos intentos seguidos. Prueba de nuevo en unos minutos." }, { status: 429 });
  }
  if (!(await emailLimiter(`pay:em:${parsed.data.email}`)).success) {
    return NextResponse.json({ error: "Ya iniciaste un pago con este correo. Revisa tu bandeja o escríbenos." }, { status: 429 });
  }

  try {
    const refCodigo = req.cookies.get(COOKIE_REFERIDO)?.value ?? null;
    const { url } = await crearCheckout(
      createSupabaseServiceRole(),
      parsed.data,
      refCodigo,
      origenPublico(req.headers, baseUrl()),
    );
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof ErrorCheckout) return NextResponse.json({ error: e.message }, { status: e.estado });
    console.error("[imt-pagos] checkout:", e);
    return NextResponse.json({ error: "No pudimos iniciar el pago. Intenta de nuevo." }, { status: 500 });
  }
}
