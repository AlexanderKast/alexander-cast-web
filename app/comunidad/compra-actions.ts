"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, emailLimiter, formLimiter } from "@/lib/rate-limit";
import { isSameOriginStrict } from "@/lib/same-origin";
import { compraSchema, leadSchema } from "@/lib/comunidad/validators";
import {
  ConfigPagoError,
  crearCheckout,
  crearPedido,
  fijarNivel,
  liberarReserva,
  obtenerPedido,
  tienePagoConfirmado,
} from "@/lib/comunidad/pedidos";
import { nivelesDisponibles } from "@/lib/comunidad/oferta";
import { pedidoDelNavegador, recordarPedido } from "@/lib/comunidad/sesion-pedido";
import { registrarEvento } from "@/lib/comunidad/analitica";

/**
 * Compra como invitado, en dos pasos:
 *   1. capturarLead → guarda los datos, el consentimiento y la entrada elegida como un PEDIDO
 *      PROPIO de este navegador (cookie firmada). Ya no se reutiliza un pedido ajeno por correo.
 *   2. irAlPago     → reserva el cupo de forma atómica, crea el checkout de Stripe y redirige.
 *
 * Ni el monto, ni la disponibilidad, ni el pedido se toman del cliente: el precio sale de la
 * tabla de la oferta, la disponibilidad se valida aquí y el pedido se identifica por la cookie.
 * Las SOLICITUDES DE INFORMACIÓN no pasan por aquí (ver lead-actions.ts): no crean pedido.
 */

export type EstadoLead =
  | { status: "idle" }
  | { status: "ok"; nombre: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export type EstadoPago = { status: "idle" } | { status: "error"; message: string; reiniciar?: boolean };

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
    nivel: fd.get("nivel"),
    privacidad: fd.get("privacidad") ?? "no",
  });
  if (!parsed.success) {
    return { status: "error", message: "Revisa los datos.", fieldErrors: errores(parsed.error.issues) };
  }
  const d = parsed.data;

  const disponibles = nivelesDisponibles();
  if (disponibles.length === 0) {
    return { status: "error", message: "Las inscripciones de esta cohorte ya cerraron. Déjanos tus datos en la lista de espera." };
  }
  if (!disponibles.includes(d.nivel)) {
    return { status: "error", message: "Esa entrada ya no está disponible. Recarga la página para ver las vigentes." };
  }

  const ip = clientIp(hdrs);
  const porIp = await formLimiter(`mia:lead:ip:${ip}`);
  const porCorreo = await emailLimiter(`mia:lead:em:${d.email}`);
  if (!porIp.success || !porCorreo.success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };
  }

  if (await tienePagoConfirmado(d.email)) {
    return {
      status: "error",
      message: "Ya tenemos un pago con ese correo. Revisa tu bandeja (y spam) o entra desde «Iniciar sesión».",
    };
  }

  try {
    // Siempre un pedido NUEVO: nunca se toca ni se devuelve el de otra persona por conocer su correo.
    const pedido = await crearPedido({
      nombre: d.nombre,
      email: d.email,
      whatsapp: d.whatsapp,
      origen: fd.get("o") === "stand" ? "stand" : "web",
      nivel: d.nivel,
      ip,
    });
    await recordarPedido(pedido.id);
    return { status: "ok", nombre: pedido.nombre };
  } catch (e) {
    console.error("[comunidad] no se pudo guardar el pedido del paso 1:", e);
    return { status: "error", message: "No pudimos guardar tus datos. Intenta de nuevo en unos segundos." };
  }
}

/* ───────────── Paso 2 ───────────── */

export async function irAlPago(_p: EstadoPago, fd: FormData): Promise<EstadoPago> {
  const hdrs = await headers();
  if (!isSameOriginStrict(hdrs)) return { status: "error", message: "Solicitud no válida." };

  const parsed = compraSchema.safeParse({ nivel: fd.get("nivel") });
  if (!parsed.success) return { status: "error", message: "Elige una entrada para continuar." };
  const { nivel } = parsed.data;

  // El pedido es el que ESTE navegador creó (cookie firmada). Un id enviado por el cliente no vale.
  const pedidoId = await pedidoDelNavegador();
  if (!pedidoId) {
    return {
      status: "error",
      reiniciar: true,
      message: "Tu sesión de compra venció o no es de este navegador. Vuelve a llenar tus datos.",
    };
  }

  // El nivel debe estar vigente HOY (la preventa cierra el 18; el cierre general, el 21 a las 8 p. m.).
  if (!nivelesDisponibles().includes(nivel)) {
    return { status: "error", message: "Esa entrada ya no está disponible. Recarga la página para ver las vigentes." };
  }

  const porIp = await formLimiter(`mia:pay:ip:${clientIp(hdrs)}`);
  if (!porIp.success) return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };

  const actual = await obtenerPedido(pedidoId);
  if (!actual) return { status: "error", reiniciar: true, message: "No encontramos tu registro. Vuelve a llenar tus datos." };
  if (actual.estado === "pagado") {
    return { status: "error", message: "Este pago ya está confirmado. Revisa tu correo para entrar." };
  }
  if (await tienePagoConfirmado(actual.email)) {
    return { status: "error", message: "Ya tenemos un pago con ese correo. Revisa tu bandeja (y spam)." };
  }

  // Elegir entrada y reservar cupo es UNA operación atómica en la base: dos compradores a la vez no
  // pueden quedarse con el último cupo. Si el servicio de cupos falla se dice, no se simula éxito.
  let reserva;
  try {
    reserva = await fijarNivel(pedidoId, nivel);
  } catch (e) {
    console.error("[comunidad] no se pudo verificar/reservar el cupo:", e);
    return { status: "error", message: "No pudimos verificar los cupos en este momento. Intenta de nuevo en unos minutos." };
  }
  if (reserva === "sin_cupo_vip") {
    return { status: "error", message: "Los cupos VIP se agotaron. Puedes elegir la otra entrada o dejar tus datos en la lista de espera." };
  }
  if (reserva === "sin_cupo_total") {
    return { status: "error", message: "Los cupos de esta cohorte se agotaron. Déjanos tus datos en la lista de espera." };
  }
  if (reserva === "pedido_no_editable") {
    return { status: "error", reiniciar: true, message: "Este pedido ya no se puede modificar. Vuelve a llenar tus datos." };
  }

  let url: string;
  try {
    const pedido = await obtenerPedido(pedidoId);
    if (!pedido) throw new Error("pedido desaparecido tras reservar");
    url = await crearCheckout(pedido);
  } catch (e) {
    await liberarReserva(pedidoId).catch(() => undefined); // el cupo vuelve a estar disponible ya
    console.error("[comunidad] no se pudo crear el checkout:", e);
    return {
      status: "error",
      message:
        e instanceof ConfigPagoError
          ? "El pago no está disponible en este momento. Intenta más tarde."
          : "No pudimos iniciar el pago. Intenta de nuevo en unos segundos.",
    };
  }

  await registrarEvento("checkout_started", { nivel });
  redirect(url);
}
