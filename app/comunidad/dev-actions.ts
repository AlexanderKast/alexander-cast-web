"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase/server";
import { correoSchema } from "@/lib/comunidad/validators";
import type { EstadoForm } from "./actions";

/**
 * ENTRADA DIRECTA DE PRUEBA — solo para desarrollo en tu equipo.
 *
 * Entra con solo el correo, sin enlace. Nunca funciona en producción:
 * exige NODE_ENV distinto de "production" Y COMUNIDAD_DEV_LOGIN=true (que
 * solo está en .env.local, no en Vercel). Sin esas dos condiciones el
 * action no hace nada.
 *
 *  - Con SUPABASE_SERVICE_ROLE_KEY: entra cualquier correo con perfil
 *    (incluido el admin), canjeando un enlace generado en el servidor.
 *  - Sin ella: solo las cuentas demo (+demoN), con la clave de .env.local.
 */
export function entradaDirectaActiva(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.COMUNIDAD_DEV_LOGIN === "true";
}

export async function entradaDirecta(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!entradaDirectaActiva()) return { status: "error", message: "No disponible." };

  const parsed = correoSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { status: "error", message: "Escribe un correo válido." };
  const email = parsed.data;

  const supabase = await createSupabaseServer();

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createSupabaseServiceRole();
    const { data: perfil } = await admin.from("mia_perfiles").select("user_id").eq("email", email).maybeSingle();
    if (!perfil) return { status: "error", message: "Ese correo no tiene perfil en la comunidad." };

    const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const hash = data?.properties?.hashed_token;
    if (!hash) return { status: "error", message: "No se pudo generar la sesión." };
    const { error } = await supabase.auth.verifyOtp({ token_hash: hash, type: "magiclink" });
    if (error) return { status: "error", message: `No se pudo entrar: ${error.message}` };
    redirect("/comunidad");
  }

  const clave = process.env.COMUNIDAD_DEV_PASSWORD;
  if (!clave || !/\+demo\d*@/.test(email)) {
    return {
      status: "error",
      message:
        "Sin SUPABASE_SERVICE_ROLE_KEY en .env.local solo entran las cuentas demo (correo+demo1@…, correo+demo2@…).",
    };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
  if (error) return { status: "error", message: "No se pudo entrar con esa cuenta demo." };
  redirect("/comunidad");
}
