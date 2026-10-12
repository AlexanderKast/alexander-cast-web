"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase/server";
import { clientIp, emailLimiter, formLimiter } from "@/lib/rate-limit";
import { isSameOriginStrict } from "@/lib/same-origin";
import {
  requireAdminComunidad,
  requireMiembro,
  requireMiembroConPrivacidad,
} from "@/lib/comunidad/auth";
import { altaAlumno } from "@/lib/comunidad/altas";
import { enviarAcceso, enviarAccesosEnLote } from "@/lib/comunidad/correo";
import { parseAlumnosCsv } from "@/lib/comunidad/csv";
import { listarCohortes } from "@/lib/comunidad/queries";
import { alumnoSchema, correoSchema, fichaSchema } from "@/lib/comunidad/validators";

export type EstadoForm =
  | { status: "idle" }
  | { status: "ok"; message: string; detalle?: string[] }
  | { status: "error"; message: string; fieldErrors?: Record<string, string>; detalle?: string[] };

function erroresPorCampo(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/* ============================================================
   Público: pedir el enlace de acceso
   ============================================================ */

const RESPUESTA_GENERICA =
  "Si tu correo está inscrito, te enviamos el enlace de acceso. Revisa tu bandeja y la carpeta de spam.";

export async function solicitarAcceso(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  // Honeypot: un humano no llena este campo.
  if (fd.get("website")) return { status: "ok", message: RESPUESTA_GENERICA };

  const hdrs = await headers();
  if (!isSameOriginStrict(hdrs)) return { status: "error", message: "Solicitud no válida." };

  const parsed = correoSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { status: "error", message: "Escribe un correo válido." };
  const email = parsed.data;

  const porIp = await formLimiter(`mia:ip:${clientIp(hdrs)}`);
  const porCorreo = await emailLimiter(`mia:em:${email}`);
  if (!porIp.success || !porCorreo.success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };
  }

  // Sin claves del servidor el correo NUNCA saldría: mejor decirlo que fingir
  // un envío (no revela nada sobre quién está inscrito).
  const faltan = [
    !(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL) && "SUPABASE_URL",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !process.env.RESEND_API_KEY && "RESEND_API_KEY",
    !(process.env.COMUNIDAD_RESEND_FROM ?? process.env.RESEND_FROM) && "RESEND_FROM",
  ].filter(Boolean) as string[];
  if (faltan.length) {
    console.error(`[comunidad] El acceso por correo no está configurado. Faltan: ${faltan.join(", ")}`);
    return {
      status: "error",
      message:
        process.env.NODE_ENV === "production"
          ? "El acceso por correo no está disponible en este momento. Intenta más tarde."
          : `Falta configurar el servidor: ${faltan.join(", ")} (agrégalas en .env.local).`,
    };
  }

  // Misma respuesta exista o no el correo (no se revela quién está inscrito),
  // y el envío va después de responder para que el tiempo tampoco lo delate.
  after(async () => {
    const { data: perfil } = await createSupabaseServiceRole()
      .from("mia_perfiles")
      .select("nombre")
      .eq("email", email)
      .maybeSingle();
    if (perfil) {
      const r = await enviarAcceso(email, perfil.nombre as string);
      if (!r.ok) console.error("[comunidad] fallo enviando acceso:", r.error);
    }
  });

  return { status: "ok", message: RESPUESTA_GENERICA };
}

/* ============================================================
   Alumno: privacidad y ficha
   ============================================================ */

export async function aceptarPrivacidad(): Promise<void> {
  const m = await requireMiembro();
  const { error } = await createSupabaseServiceRole()
    .from("mia_perfiles")
    .update({ privacidad_aceptada_en: new Date().toISOString() })
    .eq("user_id", m.userId);
  if (error) throw new Error("No se pudo guardar tu aceptación. Intenta de nuevo.");
  redirect("/comunidad");
}

export async function guardarFicha(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const m = await requireMiembroConPrivacidad();
  if (!m.inscripcion) return { status: "error", message: "No tienes una inscripción activa." };

  const parsed = fichaSchema.safeParse({
    vende: fd.get("vende"),
    a_quien: fd.get("a_quien"),
    quiere: fd.get("quiere"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos.",
      fieldErrors: erroresPorCampo(parsed.error.issues),
    };
  }

  // Con el cliente del usuario: la RLS y el trigger de la clase 1 son la barrera real.
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("mia_fichas")
    .upsert({ inscripcion_id: m.inscripcion.id, ...parsed.data }, { onConflict: "inscripcion_id" });

  if (error) {
    return {
      status: "error",
      message: error.code === "P0001" ? error.message : "No se pudo guardar. Intenta de nuevo.",
    };
  }
  revalidatePath("/comunidad");
  revalidatePath("/comunidad/ficha");
  return { status: "ok", message: "Ficha guardada." };
}

/* ============================================================
   Admin: altas, importación y envío de accesos
   ============================================================ */

export async function crearAlumno(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await requireAdminComunidad();

  const parsed = alumnoSchema.safeParse({
    nombre: fd.get("nombre"),
    email: fd.get("email"),
    whatsapp: fd.get("whatsapp") ?? "",
    entrada: fd.get("entrada"),
    cohorte_id: fd.get("cohorte_id"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos.",
      fieldErrors: erroresPorCampo(parsed.error.issues),
    };
  }
  const d = parsed.data;

  try {
    await altaAlumno({
      nombre: d.nombre,
      email: d.email,
      whatsapp: d.whatsapp,
      entrada: d.entrada,
      cohorteId: d.cohorte_id,
    });
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "No se pudo dar de alta." };
  }

  revalidatePath("/comunidad/admin");
  if (fd.get("enviar") === "on") {
    const r = await enviarAcceso(d.email, d.nombre);
    return r.ok
      ? { status: "ok", message: `${d.nombre} quedó inscrito y el acceso va en camino a ${d.email}.` }
      : {
          status: "ok",
          message: `${d.nombre} quedó inscrito, pero el correo no salió (${r.error}). Reenvíalo desde la lista.`,
        };
  }
  return { status: "ok", message: `${d.nombre} quedó inscrito.` };
}

const MAX_BYTES_CSV = 1_000_000;

export async function importarAlumnos(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await requireAdminComunidad();

  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: "error", message: "Selecciona un archivo CSV." };
  }
  if (archivo.size > MAX_BYTES_CSV) {
    return { status: "error", message: "El archivo es muy grande (máximo 1 MB)." };
  }

  const { filas, errores } = parseAlumnosCsv(await archivo.text());
  if (filas.length === 0) {
    return {
      status: "error",
      message: "No hay filas válidas para importar.",
      detalle: errores.map((e) => `Línea ${e.linea}: ${e.mensaje}`),
    };
  }

  const cohortes = await listarCohortes();
  const porNombre = new Map(cohortes.map((c) => [c.nombre.trim().toLowerCase(), c.id]));
  const porDefecto = fd.get("cohorte_id");
  const cohorteDefecto = typeof porDefecto === "string" && porDefecto ? porDefecto : cohortes[0]?.id;

  const problemas = errores.map((e) => `Línea ${e.linea}: ${e.mensaje}`);
  let creados = 0;

  for (const f of filas) {
    const cohorteId = f.cohorte ? porNombre.get(f.cohorte.toLowerCase()) : cohorteDefecto;
    if (!cohorteId) {
      problemas.push(`Línea ${f.linea}: cohorte "${f.cohorte}" no existe.`);
      continue;
    }
    try {
      await altaAlumno({
        nombre: f.nombre,
        email: f.email,
        whatsapp: f.whatsapp || undefined,
        entrada: f.entrada,
        cohorteId,
      });
      creados++;
    } catch (e) {
      problemas.push(`Línea ${f.linea} (${f.email}): ${e instanceof Error ? e.message : "error"}`);
    }
  }

  revalidatePath("/comunidad/admin");
  const message = `${creados} de ${filas.length + errores.length} filas importadas.`;
  return problemas.length
    ? { status: creados ? "ok" : "error", message, detalle: problemas }
    : { status: "ok", message };
}

export async function reenviarAcceso(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await requireAdminComunidad();
  const userId = String(fd.get("user_id") ?? "");
  const { data: perfil } = await createSupabaseServiceRole()
    .from("mia_perfiles")
    .select("email, nombre")
    .eq("user_id", userId)
    .maybeSingle();
  if (!perfil) return { status: "error", message: "Alumno no encontrado." };

  const r = await enviarAcceso(perfil.email as string, perfil.nombre as string);
  return r.ok
    ? { status: "ok", message: "Enviado." }
    : { status: "error", message: r.error };
}

/** Envía el acceso a todos los alumnos que aún no han entrado (sin privacidad aceptada). */
export async function enviarAccesosPendientes(): Promise<EstadoForm> {
  await requireAdminComunidad();
  const { data } = await createSupabaseServiceRole()
    .from("mia_perfiles")
    .select("email, nombre")
    .eq("rol", "alumno")
    .is("privacidad_aceptada_en", null)
    .limit(500);

  const lista = (data ?? []).map((p) => ({ email: p.email as string, nombre: p.nombre as string }));
  if (!lista.length) return { status: "ok", message: "No hay alumnos pendientes." };

  const { enviados, fallidos } = await enviarAccesosEnLote(lista);
  return fallidos.length
    ? {
        status: "error",
        message: `${enviados} enviados, ${fallidos.length} fallaron.`,
        detalle: fallidos,
      }
    : { status: "ok", message: `${enviados} accesos enviados.` };
}
