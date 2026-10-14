import { NextResponse, type NextRequest } from "next/server";
import { baseUrl } from "@/lib/comunidad/url";
import { origenPublico } from "@/lib/imt/origen";
import { crearSesionFacturacion } from "@/lib/imt/portal";
import { imtStripeConfigurado } from "@/lib/imt/stripe";
import { isSameOriginStrict } from "@/lib/same-origin";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Gestionar tarjeta y facturas": abre el portal de facturación de Stripe del cliente con sesión.
 * El cliente sale de su sesión, nunca de un dato del navegador, así que nadie puede abrir el
 * portal de otra empresa. La cancelación se desactiva en la configuración del portal en Stripe.
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginStrict(req.headers)) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }
  if (!imtStripeConfigurado()) {
    return NextResponse.json({ error: "La facturación aún no está disponible." }, { status: 503 });
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });

  const db = createSupabaseServiceRole();
  const { data: vinculos } = await db
    .from("portal_client_users")
    .select("client_id, portal_clients(slug, tipo)")
    .eq("auth_user_id", user.id)
    .eq("activo", true);

  type Vinculo = { client_id: string; portal_clients: { slug: string; tipo: string } | { slug: string; tipo: string }[] | null };
  const cliente = ((vinculos ?? []) as unknown as Vinculo[])
    .map((v) => ({ id: v.client_id, pc: Array.isArray(v.portal_clients) ? v.portal_clients[0] : v.portal_clients }))
    .find((v) => v.pc?.tipo === "imt");
  if (!cliente?.pc) return NextResponse.json({ error: "Tu cuenta no tiene un plan activo." }, { status: 404 });

  try {
    const url = await crearSesionFacturacion(db, cliente.id, cliente.pc.slug, origenPublico(req.headers, baseUrl()));
    if (!url) {
      return NextResponse.json(
        { error: "Todavía no hay una tarjeta registrada a tu nombre. Aparecerá aquí después de tu primer pago." },
        { status: 409 },
      );
    }
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[imt-portal] no se pudo abrir la facturación:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No pudimos abrir tu facturación. Escríbenos y lo resolvemos." }, { status: 502 });
  }
}
