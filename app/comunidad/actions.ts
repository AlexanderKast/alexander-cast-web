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
  requireDerecho,
  requireMiembroSinPrivacidad,
} from "@/lib/comunidad/auth";
import { PRODUCTO_PRINCIPAL } from "@/lib/comunidad/oferta";
import { altaManual } from "@/lib/comunidad/altas";
import { ofertaPorSlug } from "@/lib/comunidad/catalogo";
import { enviarAcceso, enviarAccesosEnLote, enviarVerificacionRegistro } from "@/lib/comunidad/correo";
import { rutaInternaPermitida, slugValido } from "@/lib/comunidad/acceso";
import { sanearUtm } from "@/lib/comunidad/consentimiento";
import { guardarRegistroPendiente } from "@/lib/comunidad/registro";
import { parseAlumnosCsv } from "@/lib/comunidad/csv";
import { alumnoSchema, correoSchema, fichaSchema, registroSchema } from "@/lib/comunidad/validators";

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
  "Si tu correo tiene una cuenta, te enviamos el enlace de acceso. Revisa tu bandeja y la carpeta de spam.";

const RESPUESTA_REGISTRO =
  "Te enviamos un enlace para confirmar tu correo. Revisa tu bandeja y la carpeta de spam; al confirmarlo, tu cuenta queda lista.";

/** Claves que el servidor necesita para generar y enviar enlaces de acceso. */
function faltanClavesDeCorreo(): string[] {
  return [
    !(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL) && "SUPABASE_URL",
    !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !process.env.RESEND_API_KEY && "RESEND_API_KEY",
    !(process.env.COMUNIDAD_RESEND_FROM ?? process.env.RESEND_FROM) && "RESEND_FROM",
  ].filter(Boolean) as string[];
}

function errorDeConfiguracion(faltan: string[]): EstadoForm {
  console.error(`[comunidad] El acceso por correo no está configurado. Faltan: ${faltan.join(", ")}`);
  return {
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "El servicio de correo no está disponible en este momento. Intenta más tarde."
        : `Falta configurar el servidor: ${faltan.join(", ")} (agrégalas en .env.local).`,
  };
}

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
  const faltan = faltanClavesDeCorreo();
  if (faltan.length) return errorDeConfiguracion(faltan);

  // `next` solo se respeta si es una de las rutas internas permitidas.
  const next = rutaInternaPermitida(fd.get("next"));

  // Misma respuesta exista o no el correo (no se revela quién está inscrito),
  // y el envío va después de responder para que el tiempo tampoco lo delate.
  after(async () => {
    const { data: perfil } = await createSupabaseServiceRole()
      .from("mia_perfiles")
      .select("nombre")
      .eq("email", email)
      .maybeSingle();
    if (perfil) {
      const r = await enviarAcceso(email, perfil.nombre as string, { next });
      if (!r.ok) console.error("[comunidad] fallo enviando acceso:", r.error);
    }
  });

  return { status: "ok", message: RESPUESTA_GENERICA };
}

/* ============================================================
   Público: crear una cuenta (sin inscripción, sin pedido)
   ============================================================ */

/**
 * Guarda un registro PENDIENTE y envía el enlace de verificación. No crea perfil,
 * sesión ni inscripción: eso solo ocurre al canjear el enlace (prueba de control
 * del correo). La respuesta es la misma exista o no la cuenta.
 */
export async function solicitarRegistro(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (fd.get("website")) return { status: "ok", message: RESPUESTA_REGISTRO }; // honeypot

  const hdrs = await headers();
  if (!isSameOriginStrict(hdrs)) return { status: "error", message: "Solicitud no válida." };

  const parsed = registroSchema.safeParse({
    nombre: fd.get("nombre"),
    email: fd.get("email"),
    whatsapp: fd.get("whatsapp") ?? "",
    privacidad: fd.get("privacidad") ?? "no",
    marketing: fd.get("marketing") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Revisa los datos.", fieldErrors: erroresPorCampo(parsed.error.issues) };
  }
  const d = parsed.data;

  // Intención (programa de interés, asesor, origen, UTM): solo datos de navegación y contacto. Nunca autoridad de
  // precio ni de acceso; el programa y la oferta se vuelven a validar contra el catálogo al usarlos.
  const programa = fd.get("programa");
  const oferta = fd.get("oferta");
  const pideAsesor = fd.get("asesor") === "1";
  const canalCrudo = fd.get("canal");
  const canal: "whatsapp" | "correo" | null = canalCrudo === "whatsapp" || canalCrudo === "correo" ? canalCrudo : null;
  if (pideAsesor) {
    if (!slugValido(programa)) return { status: "error", message: "Elige un programa para que un asesor te contacte." };
    if (!canal) {
      return { status: "error", message: "Elige cómo quieres que te contacten.", fieldErrors: { canal: "Elige un canal." } };
    }
    if (fd.get("consentimiento_contacto") !== "on") {
      return {
        status: "error",
        message: "Revisa los datos.",
        fieldErrors: { consentimiento_contacto: "Marca la casilla para autorizar que te contactemos." },
      };
    }
    if (canal === "whatsapp" && !d.whatsapp) {
      return { status: "error", message: "Revisa los datos.", fieldErrors: { whatsapp: "Para contactarte por WhatsApp necesitamos tu número." } };
    }
  }
  const intencion = {
    productoSlug: slugValido(programa) ? programa : null,
    ofertaSlug: slugValido(oferta) ? oferta : null,
    asesor: pideAsesor,
    canal: pideAsesor ? canal : null,
    contactoAutorizadoEn: pideAsesor ? new Date().toISOString() : null,
    origen: fd.get("o") === "stand" ? ("stand" as const) : ("web" as const),
    utm: {
      utm_source: sanearUtm(fd.get("utm_source")),
      utm_medium: sanearUtm(fd.get("utm_medium")),
      utm_campaign: sanearUtm(fd.get("utm_campaign")),
    },
  };

  const porIp = await formLimiter(`mia:reg:ip:${clientIp(hdrs)}`);
  const porCorreo = await emailLimiter(`mia:reg:em:${d.email}`);
  if (!porIp.success || !porCorreo.success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };
  }

  const faltan = faltanClavesDeCorreo();
  if (faltan.length) return errorDeConfiguracion(faltan);

  after(async () => {
    try {
      const registroId = await guardarRegistroPendiente({
        email: d.email,
        nombre: d.nombre,
        whatsapp: d.whatsapp,
        marketing: d.marketing === "on",
        intencion,
      });
      const r = await enviarVerificacionRegistro(d.email, d.nombre, registroId);
      if (!r.ok) console.error("[comunidad] fallo enviando la verificación de registro:", r.error);
    } catch (e) {
      console.error("[comunidad] fallo guardando el registro pendiente:", e);
    }
  });

  return { status: "ok", message: RESPUESTA_REGISTRO };
}

/* ============================================================
   Alumno: privacidad y ficha
   ============================================================ */

export async function aceptarPrivacidad(): Promise<void> {
  const m = await requireMiembroSinPrivacidad();
  const { error } = await createSupabaseServiceRole()
    .from("mia_perfiles")
    .update({ privacidad_aceptada_en: new Date().toISOString() })
    .eq("user_id", m.userId);
  if (error) throw new Error("No se pudo guardar tu aceptación. Intenta de nuevo.");
  redirect("/comunidad");
}

export async function guardarFicha(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  // La ficha es contenido de Master IA 360: exige el derecho vigente sobre ESE programa (y la RLS lo repite).
  const { derecho } = await requireDerecho(PRODUCTO_PRINCIPAL);

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
    .upsert({ inscripcion_id: derecho.id, ...parsed.data }, { onConflict: "inscripcion_id" });

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
  const admin = await requireAdminComunidad();

  const parsed = alumnoSchema.safeParse({
    nombre: fd.get("nombre"),
    email: fd.get("email"),
    whatsapp: fd.get("whatsapp") ?? "",
    oferta_id: fd.get("oferta_id"),
    motivo: fd.get("motivo"),
    tipo: fd.get("tipo") === "cortesia" ? "cortesia" : "admin",
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
    // Concesión manual: queda con autor y motivo, y NO cuenta como una venta.
    await altaManual({
      nombre: d.nombre,
      email: d.email,
      whatsapp: d.whatsapp,
      ofertaId: d.oferta_id,
      adminId: admin.userId,
      motivo: d.motivo,
      tipo: d.tipo,
    });
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "No se pudo dar de alta." };
  }

  revalidatePath("/comunidad/admin");
  if (fd.get("enviar") === "on") {
    const r = await enviarAcceso(d.email, d.nombre, { next: "/comunidad/mis-programas" });
    return r.ok
      ? { status: "ok", message: `${d.nombre} quedó con acceso y el enlace va en camino a ${d.email}.` }
      : {
          status: "ok",
          message: `${d.nombre} quedó con acceso, pero el correo no salió (${r.error}). Reenvíalo desde la lista.`,
        };
  }
  return { status: "ok", message: `${d.nombre} quedó con acceso.` };
}

const MAX_BYTES_CSV = 1_000_000;

export async function importarAlumnos(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const admin = await requireAdminComunidad();

  const archivo = fd.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: "error", message: "Selecciona un archivo CSV." };
  }
  if (archivo.size > MAX_BYTES_CSV) {
    return { status: "error", message: "El archivo es muy grande (máximo 1 MB)." };
  }
  const productoId = fd.get("producto_id");
  if (typeof productoId !== "string" || !productoId) return { status: "error", message: "Elige el programa." };

  const { filas, errores } = parseAlumnosCsv(await archivo.text());
  if (filas.length === 0) {
    return {
      status: "error",
      message: "No hay filas válidas para importar.",
      detalle: errores.map((e) => `Línea ${e.linea}: ${e.mensaje}`),
    };
  }

  const motivo = `Importación CSV ${new Date().toISOString().slice(0, 10)} por ${admin.email}`;
  const problemas = errores.map((e) => `Línea ${e.linea}: ${e.mensaje}`);
  const ofertas = new Map<string, string | null>(); // slug → id de oferta (una consulta por entrada distinta)
  let creados = 0;

  for (const f of filas) {
    if (!ofertas.has(f.entrada)) ofertas.set(f.entrada, (await ofertaPorSlug(productoId, f.entrada))?.id ?? null);
    const ofertaId = ofertas.get(f.entrada);
    if (!ofertaId) {
      problemas.push(`Línea ${f.linea}: la entrada "${f.entrada}" no existe en ese programa.`);
      continue;
    }
    try {
      await altaManual({
        nombre: f.nombre,
        email: f.email,
        whatsapp: f.whatsapp || undefined,
        ofertaId,
        adminId: admin.userId,
        motivo,
        tipo: "admin",
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
