"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clientIp, formLimiter } from "@/lib/rate-limit";
import { isSameOriginStrict } from "@/lib/same-origin";
import { requireMiembro } from "@/lib/comunidad/auth";
import { obtenerOferta, obtenerProductoPublicado } from "@/lib/comunidad/catalogo";
import { crearOportunidad } from "@/lib/comunidad/oportunidades";
import { ConfigPagoError, crearCheckout, crearOReanudarPedido, liberarReserva, obtenerPedidoPropio } from "@/lib/comunidad/pedidos";
import { registrarEvento } from "@/lib/comunidad/analitica";
import { uuidValido } from "@/lib/comunidad/acceso";

/**
 * Compra AUTENTICADA, dentro de la plataforma. No hay checkout invitado: toda acción parte de una sesión
 * verificada y de un pedido que pertenece a esa cuenta. De los datos del formulario solo se usa el id de la
 * oferta elegida (o del pedido propio); precio, disponibilidad, cupos y requisitos los valida la base.
 */

export type EstadoCompra = { status: "idle" } | { status: "error"; message: string };
export type EstadoAsesor = { status: "idle" } | { status: "ok" } | { status: "error"; message: string };

const ERROR_GENERICO = "No pudimos iniciar el pago. Intenta de nuevo en unos segundos.";

async function comprobarOrigen(): Promise<string | null> {
  const hdrs = await headers();
  if (!isSameOriginStrict(hdrs)) return null;
  const limite = await formLimiter(`mia:buy:ip:${clientIp(hdrs)}`);
  return limite.success ? "ok" : "limite";
}

/** Crea (o reanuda) el pedido propio de la oferta elegida y lleva al checkout. */
export async function iniciarCompra(_p: EstadoCompra, fd: FormData): Promise<EstadoCompra> {
  const origen = await comprobarOrigen();
  if (origen === null) return { status: "error", message: "Solicitud no válida." };
  if (origen === "limite") return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };

  const miembro = await requireMiembro(); // sin sesión verificada no hay compra
  const ofertaId = fd.get("oferta");
  if (!uuidValido(ofertaId)) return { status: "error", message: "Elige una oferta." };

  let url: string;
  try {
    const r = await crearOReanudarPedido(miembro.userId, ofertaId);
    if (!r.ok) return { status: "error", message: r.mensaje };
    try {
      url = await crearCheckout(r.pedido);
    } catch (e) {
      await liberarReserva(r.pedido.id).catch(() => undefined); // el cupo vuelve a estar disponible ya
      throw e;
    }
    await registrarEvento("checkout_started", {
      producto: r.pedido.snapshot?.producto?.slug ?? "desconocido",
      oferta: r.pedido.snapshot?.oferta?.slug ?? r.pedido.nivel,
    });
  } catch (e) {
    console.error("[comunidad] no se pudo iniciar la compra:", e);
    return {
      status: "error",
      message: e instanceof ConfigPagoError ? "El pago no está disponible en este momento. Intenta más tarde." : ERROR_GENERICO,
    };
  }
  redirect(url);
}

/**
 * Paga un pedido que ya existe (p. ej. el que creó un asesor). Solo si es del usuario con sesión: un id de
 * pedido ajeno se trata como inexistente.
 */
export async function pagarPedido(_p: EstadoCompra, fd: FormData): Promise<EstadoCompra> {
  const origen = await comprobarOrigen();
  if (origen === null) return { status: "error", message: "Solicitud no válida." };
  if (origen === "limite") return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };

  const miembro = await requireMiembro();
  const id = fd.get("pedido");
  if (!uuidValido(id)) return { status: "error", message: "Pedido no válido." };

  const pedido = await obtenerPedidoPropio(id, miembro.userId);
  if (!pedido) return { status: "error", message: "No encontramos ese pedido en tu cuenta." };
  if (pedido.estado === "pagado") return { status: "error", message: "Este pedido ya está pagado." };
  if (!pedido.ofertaId) return { status: "error", message: ERROR_GENERICO };

  let url: string;
  try {
    // Reanuda el pedido: la base vuelve a validar ventana, cupos y requisitos y renueva la reserva.
    const r = await crearOReanudarPedido(miembro.userId, pedido.ofertaId);
    if (!r.ok) return { status: "error", message: r.mensaje };
    try {
      url = await crearCheckout(r.pedido);
    } catch (e) {
      await liberarReserva(r.pedido.id).catch(() => undefined);
      throw e;
    }
  } catch (e) {
    console.error("[comunidad] no se pudo pagar el pedido:", e);
    return {
      status: "error",
      message: e instanceof ConfigPagoError ? "El pago no está disponible en este momento. Intenta más tarde." : ERROR_GENERICO,
    };
  }
  redirect(url);
}

/**
 * La cuenta pide que un asesor la contacte. Crea una OPORTUNIDAD vinculada a su cuenta (con consentimiento
 * explícito para el canal elegido). No crea pedido, no reserva cupo y no concede acceso. Idempotente.
 */
export async function solicitarAsesor(_p: EstadoAsesor, fd: FormData): Promise<EstadoAsesor> {
  const origen = await comprobarOrigen();
  if (origen === null) return { status: "error", message: "Solicitud no válida." };
  if (origen === "limite") return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };

  const miembro = await requireMiembro();
  const slug = fd.get("programa");
  const canal = fd.get("canal");
  const ofertaId = fd.get("oferta");

  if (fd.get("consentimiento") !== "on") {
    return { status: "error", message: "Marca la casilla para autorizar que te contactemos." };
  }
  if (canal !== "whatsapp" && canal !== "correo") return { status: "error", message: "Elige cómo quieres que te contacten." };
  if (canal === "whatsapp" && !miembro.whatsapp) {
    return { status: "error", message: "Para contactarte por WhatsApp necesitamos tu número. Agrégalo en «Mi cuenta» o elige el correo." };
  }
  if (typeof slug !== "string") return { status: "error", message: "Programa no válido." };

  const producto = await obtenerProductoPublicado(slug);
  if (!producto) return { status: "error", message: "Programa no válido." };
  const oferta = uuidValido(ofertaId) ? await obtenerOferta(ofertaId) : null;

  try {
    await crearOportunidad({
      userId: miembro.userId,
      productoId: producto.id,
      ofertaId: oferta && oferta.productoId === producto.id ? oferta.id : null,
      canal,
      origen: "web",
      contactoAutorizadoEn: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[comunidad] no se pudo crear la oportunidad:", e);
    return { status: "error", message: "No pudimos registrar tu solicitud. Intenta de nuevo en unos segundos." };
  }
  await registrarEvento("advisor_requested", { producto: producto.slug });
  revalidatePath(`/comunidad/programas/${producto.slug}`);
  return { status: "ok" };
}
