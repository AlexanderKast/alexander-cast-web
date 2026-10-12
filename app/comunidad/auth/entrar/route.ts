import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSameOriginStrict } from "@/lib/same-origin";
import { rutaInternaPermitida } from "@/lib/comunidad/acceso";
import { destinoDeUsuario } from "@/lib/comunidad/auth";
import { esTipoToken } from "@/lib/comunidad/correo";
import { pedidoIdValido } from "@/lib/comunidad/pagos";
import { completarRegistro } from "@/lib/comunidad/registro";
import { registrarEvento } from "@/lib/comunidad/analitica";

/**
 * Canjea el token del correo por una sesión. Solo POST desde nuestra propia
 * página (el GET de la confirmación nunca gasta el token).
 *
 * Prueba de control del correo: se exige que Supabase devuelva el usuario con
 * el correo CONFIRMADO. Solo con esa identidad verificada se aplica un registro
 * pendiente, y nunca se toca un perfil existente ni un rol.
 */
export async function POST(req: NextRequest) {
  const aLogin = () => NextResponse.redirect(new URL("/comunidad/login?error=1", req.url), 303);

  if (!isSameOriginStrict(req.headers)) return aLogin();

  const form = await req.formData();
  const tokenHash = form.get("token_hash");
  if (typeof tokenHash !== "string" || !tokenHash || tokenHash.length > 200) return aLogin();

  // El tipo lo fijó Supabase al generar el enlace (magiclink o signup); lista cerrada.
  const tipo = esTipoToken(form.get("type")) ? (form.get("type") as "magiclink" | "signup") : "magiclink";
  const registroId = pedidoIdValido(form.get("reg")); // mismo formato UUID
  const next = rutaInternaPermitida(form.get("next"));

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  if (error || !data.user?.email) return aLogin();

  // Sin correo confirmado no hay sesión útil: cerramos y no aplicamos nada.
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return aLogin();
  }

  let registroCreado = false;
  if (registroId) {
    try {
      registroCreado = (await completarRegistro({ id: data.user.id, email: data.user.email }, registroId)) === "creado";
    } catch (e) {
      console.error("[comunidad] no se pudo completar el registro:", e);
    }
  }

  const destino = await destinoDeUsuario(data.user.id);

  // Identidad verificada pero sin perfil del módulo (p. ej. enlace de registro vencido
  // o usuario global del portal/admin): no es miembro, no dejamos sesión abierta.
  if (destino === "/comunidad/login") {
    await supabase.auth.signOut();
    const url = new URL(registroId ? "/comunidad/registro?error=1" : "/comunidad/login?error=1", req.url);
    return NextResponse.redirect(url, 303);
  }

  if (registroCreado) await registrarEvento("registration_verified");
  await registrarEvento("login_success");

  // `next` solo vale si el destino resuelto ya permite verla; los guards del servidor deciden igualmente.
  const libres = ["/comunidad/mi-cuenta", "/comunidad/unete"];
  const final = next && (libres.includes(next) || destino === "/comunidad") ? next : destino;
  return NextResponse.redirect(new URL(final, req.url), 303);
}
