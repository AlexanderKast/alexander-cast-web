import { NextResponse, type NextRequest } from "next/server";
import { esTipoToken, esTokenHash } from "@/lib/imt/portal-utils";
import { isSameOriginStrict } from "@/lib/same-origin";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Canjea el token del correo por una sesión del portal. Solo POST desde nuestra propia página
 * (el GET de /portal/entrar nunca gasta el token).
 *
 * Se exige que Supabase devuelva el correo CONFIRMADO y que la persona tenga un portal activo:
 * un usuario sin portal (p. ej. alguien que pidió un enlace para un correo cualquiera) no deja
 * sesión abierta.
 */
export async function POST(req: NextRequest) {
  const aLogin = () => NextResponse.redirect(new URL("/portal/login?error=1", req.url), 303);

  if (!isSameOriginStrict(req.headers)) return aLogin();

  const form = await req.formData();
  const tokenHash = form.get("token_hash");
  if (!esTokenHash(tokenHash)) return aLogin();
  const tipo = esTipoToken(form.get("type")) ? (form.get("type") as "magiclink" | "signup") : "magiclink";

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  if (error || !data.user?.email) return aLogin();

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return aLogin();
  }

  const { data: acceso } = await createSupabaseServiceRole()
    .from("portal_client_users")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .eq("activo", true)
    .limit(1);
  if (!Array.isArray(acceso) || acceso.length === 0) {
    await supabase.auth.signOut();
    return aLogin();
  }

  return NextResponse.redirect(new URL("/portal", req.url), 303);
}
