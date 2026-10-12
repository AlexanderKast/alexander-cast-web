"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, emailLimiter, formLimiter } from "@/lib/rate-limit";
import { isSameOriginStrict } from "@/lib/same-origin";
import { compraSchema, leadSchema } from "@/lib/comunidad/validators";
import {
  ConfigPagoError,
  cambiarNivel,
  crearCheckout,
  cuposRestantes,
  guardarLead,
  obtenerPedido,
  tienePagoConfirmado,
} from "@/lib/comunidad/pedidos";
import { nivelesDisponibles } from "@/lib/comunidad/oferta";

/**
 * Formulario en dos pasos:
 *   1. capturarLead  → guarda los datos y el consentimiento (el lead queda registrado aunque no pague).
 *   2. irAlPago      → fija la entrada elegida, crea el checkout de Stripe y redirige.
 */

export type EstadoLead =
  | { status: "idle" }
  | { status: "ok"; pedidoId: string; nombre: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export type EstadoPago = { status: "idle" } | { status: "error"; message: string };

function errores(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/* ───────────── Paso 1 ───────────── */

export async function capturarLead(_p: EstadoLead, fd: FormData): Promise<EstadoLead> {
  if (fd.get("website")) return { status: "error", message: "Solicitud no válida." }; // honeypot

  const hdrs = await headers();
  if (!isSameOriginStrict(hdrs)) return { status: "error", message: "Solicitud no válida." };

  const parsed = leadSchema.safeParse({
    nombre: fd.get("nombre"),
    email: fd.get("email"),
    whatsapp: fd.get("whatsapp"),
    acepto: fd.get("acepto") ?? "no",
  });
  if (!parsed.success) {
    return { status: "error", message: "Revisa los datos.", fieldErrors: errores(parsed.error.issues) };
  }
  const d = parsed.data;

  const ip = clientIp(hdrs);
  const porIp = await formLimiter(`mia:lead:ip:${ip}`);
  const porCorreo = await emailLimiter(`mia:lead:em:${d.email}`);
  if (!porIp.success || !porCorreo.success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };
  }

  const disponibles = nivelesDisponibles();
  if (disponibles.length === 0) {
    return { status: "error", message: "Las inscripciones de esta cohorte ya cerraron." };
  }

  if (await tienePagoConfirmado(d.email)) {
    return {
      status: "error",
      message: "Ya tenemos un pago con ese correo. Revisa tu bandeja (y spam) o entra desde «Ya tienes cuenta».",
    };
  }

  try {
    const pedido = await guardarLead({
      nombre: d.nombre,
      email: d.email,
      whatsapp: d.whatsapp,
      origen: fd.get("o") === "stand" ? "stand" : "web",
      nivel: disponibles[0],
      ip,
    });
    return { status: "ok", pedidoId: pedido.id, nombre: pedido.nombre };
  } catch (e) {
    console.error("[comunidad] no se pudo guardar el lead:", e);
    return { status: "error", message: "No pudimos guardar tus datos. Intenta de nuevo en unos segundos." };
  }
}

/* ───────────── Paso 2 ───────────── */

export async function irAlPago(_p: EstadoPago, fd: FormData): Promise<EstadoPago> {
  const hdrs = await headers();
  if (!isSameOriginStrict(hdrs)) return { status: "error", message: "Solicitud no válida." };

  const parsed = compraSchema.safeParse({ pedido: fd.get("pedido"), nivel: fd.get("nivel") });
  if (!parsed.success) return { status: "error", message: "Elige una entrada para continuar." };
  const { pedido: pedidoId, nivel } = parsed.data;

  // El nivel debe estar vigente HOY (la preventa cierra el 18; el cierre general, el 21 a las 8 p. m.).
  if (!nivelesDisponibles().includes(nivel)) {
    return { status: "error", message: "Ese nivel ya no está disponible. Recarga la página para ver las opciones vigentes." };
  }

  const porIp = await formLimiter(`mia:pay:ip:${clientIp(hdrs)}`);
  if (!porIp.success) return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };

  const actual = await obtenerPedido(pedidoId);
  if (!actual) return { status: "error", message: "No encontramos tu registro. Vuelve a llenar tus datos." };
  if (actual.estado === "pagado") {
    return { status: "error", message: "Este pago ya está confirmado. Revisa tu correo para entrar." };
  }
  if (await tienePagoConfirmado(actual.email)) {
    return { status: "error", message: "Ya tenemos un pago con ese correo. Revisa tu bandeja (y spam)." };
  }

  const cupos = await cuposRestantes(pedidoId);
  if (cupos.total <= 0 || (nivel === "vip" && cupos.vip <= 0)) {
    return {
      status: "error",
      message:
        nivel === "vip" && cupos.total > 0
          ? "Los cupos VIP se agotaron. Puedes elegir el otro nivel o escribirnos por WhatsApp."
          : "Los cupos de esta cohorte se agotaron. Escríbenos por WhatsApp y te dejamos en la lista de espera.",
    };
  }

  let url: string;
  try {
    const pedido = await cambiarNivel(pedidoId, nivel);
    if (!pedido) return { status: "error", message: "Este pedido ya no se puede modificar. Vuelve a llenar tus datos." };
    url = await crearCheckout(pedido);
  } catch (e) {
    console.error("[comunidad] no se pudo crear el checkout:", e);
    return {
      status: "error",
      message:
        e instanceof ConfigPagoError
          ? "El pago no está disponible en este momento. Escríbenos por WhatsApp y te ayudamos."
          : "No pudimos iniciar el pago. Intenta de nuevo en unos segundos.",
    };
  }
  redirect(url);
}
