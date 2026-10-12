import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isSameOriginStrict } from "@/lib/same-origin";
import { rutaDeInteres, rutaInternaPermitida, uuidValido } from "@/lib/comunidad/acceso";
import { destinoDeUsuario } from "@/lib/comunidad/auth";
import { esTipoToken } from "@/lib/comunidad/correo";
import { crearDesdeIntencion } from "@/lib/comunidad/oportunidades";
import { vincularPedidosHistoricos } from "@/lib/comunidad/pedidos";
import { completarRegistro, type IntencionRegistro } from "@/lib/comunidad/registro";
import { registrarEvento } from "@/lib/comunidad/analitica";

/**
 * Canjea el token del correo por una sesión. Solo POST desde nuestra propia página (el GET de la confirmación
 * nunca gasta el token).
 *
 * Prueba de control del correo: se exige que Supabase devuelva el usuario con el correo CONFIRMADO. Solo con esa
 * identidad verificada se aplica un registro pendiente, se vinculan pagos históricos de ESE correo y se crea una
 * oportunidad si pidió asesor. Nunca se toca un perfil existente ni un rol, y nada de esto concede acceso pagado.
 */
export async function POST(req: NextRequest) {
  const aLogin = () => NextResponse.redirect(new URL("/comunidad/login?error=1", req.url), 303);

  if (!isSameOriginStrict(req.headers)) return aLogin();

  const form = await req.formData();
  const tokenHash = form.get("token_hash");
  if (typeof tokenHash !== "string" || !tokenHash || tokenHash.length > 200) return aLogin();

  // El tipo lo fijó Supabase al generar el enlace (magiclink o signup); lista cerrada.
  const tipo = esTipoToken(form.get("type")) ? (form.get("type") as "magiclink" | "signup") : "magiclink";
  const registroCrudo = form.get("reg");
  const registroId = uuidValido(registroCrudo) ? registroCrudo.toLowerCase() : null;
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
  let intencion: IntencionRegistro | null = null;
  if (registroId) {
    try {
      const r = await completarRegistro({ id: data.user.id, email: data.user.email }, registroId);
      registroCreado = r.resultado === "creado";
      intencion = r.intencion;
    } catch (e) {
      console.error("[comunidad] no se pudo completar el registro:", e);
    }
  }

  const destino = await destinoDeUsuario(data.user.id);

  // Identidad verificada pero sin perfil de la plataforma (enlace de registro vencido, o usuario global del
  // portal/admin): no es miembro, no dejamos sesión abierta.
  if (destino === "/comunidad/login") {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(registroId ? "/comunidad/registro?error=1" : "/comunidad/login?error=1", req.url), 303);
  }

  // Pagos de la compra invitada anterior hechos con ESTE correo (ya verificado): se vinculan a esta cuenta.
  await vincularPedidosHistoricos(data.user.id, data.user.email).catch((e) =>
    console.error("[comunidad] no se pudieron vincular pedidos históricos:", e),
  );

  // Si el registro pidió un asesor (con consentimiento de contacto), se crea la oportunidad vinculada a la cuenta.
  if (intencion) {
    try {
      const op = await crearDesdeIntencion(data.user.id, intencion);
      if (op?.creada) await registrarEvento("advisor_requested", { producto: intencion.productoSlug ?? "desconocido" });
    } catch (e) {
      console.error("[comunidad] no se pudo crear la oportunidad:", e);
    }
  }

  if (registroCreado) await registrarEvento("registration_verified");
  await registrarEvento("login_success");

  // Adónde ir: privacidad pendiente primero; luego `next`; luego el programa de interés; un registro sin
  // intención abre el catálogo; un inicio de sesión normal, el panel.
  let final: string;
  if (destino === "/comunidad/bienvenida") final = destino;
  else if (next) final = next;
  else if (intencion?.productoSlug) final = rutaDeInteres(intencion.productoSlug);
  else if (registroId) final = "/comunidad/programas";
  else final = "/comunidad";

  return NextResponse.redirect(new URL(final, req.url), 303);
}
