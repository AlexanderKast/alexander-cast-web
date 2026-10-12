import "server-only";
import type Stripe from "stripe";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { altaAlumno } from "./altas";
import { enviarAcceso } from "./correo";
import { listarCohortes } from "./queries";
import {
  decidirPago,
  ESTADOS_PAGABLES,
  pedidoIdValido,
  type EstadoPedido,
  type PagoNormalizado,
  type PedidoEsperado,
} from "./pagos";
import { CUPOS_TOTAL, CUPOS_VIP, incluyeSesionArranque, montoCentavos, NIVELES, type Nivel } from "./oferta";
import { DESCRIPCION_PRODUCTO, MONEDA, NOMBRE_PRODUCTO } from "./precio";
import { getStripe, simuladorActivo, stripeConfigurado } from "./stripe";
import { baseUrl } from "./url";
import { registrarEvento } from "./analitica";

export class ConfigPagoError extends Error {}

export interface Pedido {
  id: string;
  email: string;
  nombre: string;
  whatsapp: string | null;
  montoCentavos: number;
  moneda: string;
  estado: EstadoPedido;
  motivoRevision: string | null;
  origen: "web" | "stand";
  nivel: Nivel;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  checkoutUrl: string | null;
  userId: string | null;
  aprovisionadoEn: string | null;
  errorAprovisionamiento: string | null;
  pagadoEn: string | null;
  bonusIncluido: boolean;
  createdAt: string;
}

const COLS =
  "id, email, nombre, whatsapp, monto_centavos, moneda, estado, motivo_revision, origen, nivel, stripe_session_id, " +
  "stripe_payment_intent, checkout_url, user_id, aprovisionado_en, error_aprovisionamiento, pagado_en, bonus_incluido, created_at";

function aPedido(r: Record<string, unknown>): Pedido {
  return {
    id: r.id as string,
    email: r.email as string,
    nombre: r.nombre as string,
    whatsapp: (r.whatsapp as string | null) ?? null,
    montoCentavos: r.monto_centavos as number,
    moneda: r.moneda as string,
    estado: r.estado as EstadoPedido,
    motivoRevision: (r.motivo_revision as string | null) ?? null,
    origen: r.origen as "web" | "stand",
    nivel: r.nivel as Nivel,
    stripeSessionId: (r.stripe_session_id as string | null) ?? null,
    stripePaymentIntent: (r.stripe_payment_intent as string | null) ?? null,
    checkoutUrl: (r.checkout_url as string | null) ?? null,
    userId: (r.user_id as string | null) ?? null,
    aprovisionadoEn: (r.aprovisionado_en as string | null) ?? null,
    errorAprovisionamiento: (r.error_aprovisionamiento as string | null) ?? null,
    pagadoEn: (r.pagado_en as string | null) ?? null,
    bonusIncluido: r.bonus_incluido === true,
    createdAt: r.created_at as string,
  };
}

const db = () => createSupabaseServiceRole();

/* ============================================================
   Pedidos y checkout
   ============================================================ */

export async function crearPedido(input: {
  nombre: string;
  email: string;
  whatsapp?: string;
  origen: "web" | "stand";
  nivel: Nivel;
  ip: string;
}): Promise<Pedido> {
  const { data, error } = await db()
    .from("mia_pedidos")
    .insert({
      nombre: input.nombre,
      email: input.email,
      whatsapp: input.whatsapp ?? null,
      // El monto sale SIEMPRE de la tabla de la oferta, nunca del navegador.
      monto_centavos: montoCentavos(input.nivel),
      moneda: MONEDA,
      nivel: input.nivel,
      origen: input.origen,
      privacidad_aceptada_en: new Date().toISOString(),
      privacidad_ip: input.ip,
      bonus_incluido: incluyeSesionArranque(input.nivel),
    })
    .select(COLS)
    .single();
  if (error || !data) throw new Error(`No se pudo crear el pedido: ${error?.message}`);
  return aPedido(data as unknown as Record<string, unknown>);
}

/** Del panel: por cada correo, solo el pedido sin pagar MÁS RECIENTE (los pagados y especiales se muestran todos). */
export function sinDuplicadosPendientes(pedidos: Pedido[]): Pedido[] {
  const vistos = new Set<string>();
  return pedidos.filter((p) => {
    if (p.estado !== "pendiente" && p.estado !== "abandonado" && p.estado !== "fallido") return true;
    const clave = p.email.toLowerCase();
    if (vistos.has(clave)) return false;
    vistos.add(clave); // la lista llega de más nuevo a más viejo
    return true;
  });
}

export type ResultadoNivel = "ok" | "sin_cupo_total" | "sin_cupo_vip" | "pedido_no_editable";

/**
 * Paso 2: fija el nivel (y con él el monto) Y reserva el cupo en una sola
 * operación atómica en la base (lock): dos compradores simultáneos no pueden
 * quedarse con el último cupo. Solo funciona mientras el pedido siga sin pagar.
 */
export async function fijarNivel(pedidoId: string, nivel: Nivel): Promise<ResultadoNivel> {
  const { data, error } = await db().rpc("mia_fijar_nivel", {
    p_pedido: pedidoId,
    p_nivel: nivel,
    p_monto: montoCentavos(nivel),
    p_bonus: incluyeSesionArranque(nivel),
    p_total: CUPOS_TOTAL,
    p_vip: CUPOS_VIP,
  });
  if (error) throw new Error(`No se pudo reservar el cupo: ${error.message}`);
  const r = String(data);
  return r === "ok" || r === "sin_cupo_total" || r === "sin_cupo_vip" ? r : "pedido_no_editable";
}

/** Libera la reserva si el checkout no se pudo crear (el cupo vuelve a estar disponible ya). */
export async function liberarReserva(pedidoId: string): Promise<void> {
  await db().from("mia_pedidos").update({ reservado_hasta: null }).eq("id", pedidoId).eq("estado", "pendiente");
}

export async function obtenerPedido(id: string): Promise<Pedido | null> {
  const { data } = await db().from("mia_pedidos").select(COLS).eq("id", id).maybeSingle();
  return data ? aPedido(data as unknown as Record<string, unknown>) : null;
}

export async function listarPedidos(limite = 300): Promise<Pedido[]> {
  const { data } = await db().from("mia_pedidos").select(COLS).order("created_at", { ascending: false }).limit(limite);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(aPedido);
}

/** Una compra a medias de más de 30 min ya es recuperable (Stripe cierra la sesión a los 31). */
export function idsRecuperables(pedidos: Pedido[], ahora: number = Date.now()): Set<string> {
  return new Set(
    pedidos
      .filter(
        (p) =>
          (p.estado === "abandonado" || p.estado === "fallido" || p.estado === "pendiente") &&
          ahora - new Date(p.createdAt).getTime() > 30 * 60_000,
      )
      .map((p) => p.id),
  );
}

/**
 * Cupos que quedan: 200 en total y 10 de VIP. Cuenta inscritos, pagos ya
 * confirmados que aún no tienen cuenta y checkouts abiertos (30 min de
 * reserva), para no vender el mismo cupo a dos personas a la vez.
 */
export async function cuposRestantes(excluirPedidoId?: string): Promise<{ total: number; vip: number }> {
  const admin = db();
  const n = (r: { count: number | null }) => r.count ?? 0;
  // Reservan cupo los pedidos que ya eligieron entrada y siguen dentro de su ventana de reserva
  // (mia_fijar_nivel la fija de forma atómica). Un lead del paso 1 no reserva nada. El pedido
  // que consulta no cuenta contra sí mismo.
  const reservas = () => {
    let q = admin
      .from("mia_pedidos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente")
      .gt("reservado_hasta", new Date().toISOString());
    if (excluirPedidoId) q = q.neq("id", excluirPedidoId);
    return q;
  };

  const [insc, inscVip, pag, pagVip, pend, pendVip] = await Promise.all([
    admin.from("mia_inscripciones").select("id", { count: "exact", head: true }).eq("estado", "activa"),
    admin.from("mia_inscripciones").select("id", { count: "exact", head: true }).eq("estado", "activa").eq("entrada", "vip"),
    admin.from("mia_pedidos").select("id", { count: "exact", head: true }).eq("estado", "pagado").is("aprovisionado_en", null),
    admin.from("mia_pedidos").select("id", { count: "exact", head: true }).eq("estado", "pagado").is("aprovisionado_en", null).eq("nivel", "vip"),
    reservas(),
    reservas().eq("nivel", "vip"),
  ]);

  return {
    total: Math.max(0, CUPOS_TOTAL - n(insc) - n(pag) - n(pend)),
    vip: Math.max(0, CUPOS_VIP - n(inscVip) - n(pagVip) - n(pendVip)),
  };
}

/** ¿Ya hay un pago confirmado con este correo? Evita cobrar dos veces a la misma persona. */
export async function tienePagoConfirmado(email: string): Promise<boolean> {
  const { count } = await db()
    .from("mia_pedidos")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("estado", "pagado");
  return (count ?? 0) > 0;
}

/**
 * Crea la sesión de Stripe Checkout (o el simulador en desarrollo) y guarda
 * el enlace. Idempotente por pedido: reintentar no crea sesiones duplicadas.
 */
export async function crearCheckout(pedido: Pedido): Promise<string> {
  const base = baseUrl();

  if (stripeConfigurado()) {
    // Si había un checkout abierto (cambió de nivel), se cierra: no pueden quedar dos enlaces de pago vivos.
    if (pedido.stripeSessionId) {
      await getStripe().checkout.sessions.expire(pedido.stripeSessionId).catch(() => undefined);
    }
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: pedido.moneda,
              unit_amount: pedido.montoCentavos,
              product_data: { name: `${NOMBRE_PRODUCTO} — ${NIVELES[pedido.nivel].nombre}`, description: DESCRIPCION_PRODUCTO },
            },
          },
        ],
        customer_email: pedido.email,
        client_reference_id: pedido.id,
        metadata: { pedido_id: pedido.id },
        payment_intent_data: { metadata: { pedido_id: pedido.id }, description: NOMBRE_PRODUCTO },
        success_url: `${base}/comunidad/gracias?p=${pedido.id}`,
        // Vuelve a la compra; el pedido se retoma con la cookie firmada de este navegador, no con un id en la URL.
        cancel_url: `${base}/comunidad/unete?cancelado=1#compra`,
        locale: "es",
        // Mínimo permitido por Stripe: 30 min. Pasado ese tiempo llega checkout.session.expired.
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      },
    );
    if (!session.url) throw new ConfigPagoError("Stripe no devolvió el enlace de pago.");
    await db()
      .from("mia_pedidos")
      .update({ stripe_session_id: session.id, checkout_url: session.url })
      .eq("id", pedido.id);
    return session.url;
  }

  if (simuladorActivo()) {
    const url = `${base}/comunidad/pago/simulador/${pedido.id}`;
    await db().from("mia_pedidos").update({ checkout_url: url }).eq("id", pedido.id);
    return url;
  }

  throw new ConfigPagoError("Los pagos todavía no están configurados (falta STRIPE_SECRET_KEY).");
}

/* ============================================================
   Conciliación de pagos
   ============================================================ */

export interface ResultadoPago {
  resultado: string;
  pedidoId: string | null;
}

function estadoDePago(valor: string): PagoNormalizado["estado"] {
  return valor === "paid" || valor === "unpaid" || valor === "no_payment_required" ? valor : "unknown";
}

export function normalizarSesion(s: Stripe.Checkout.Session): PagoNormalizado {
  const pi = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
  return {
    sessionId: s.id,
    paymentIntent: pi,
    estado: estadoDePago(String(s.payment_status)),
    montoCentavos: s.amount_total ?? null,
    moneda: s.currency ?? null,
    pedidoId: pedidoIdValido(s.metadata?.pedido_id ?? s.client_reference_id),
  };
}

/** Aplica un pago ya normalizado. Es el MISMO camino para Stripe y para el simulador. */
export async function procesarPago(pago: PagoNormalizado): Promise<ResultadoPago> {
  const pedido = pago.pedidoId ? await obtenerPedido(pago.pedidoId) : null;
  const esperado: PedidoEsperado | null = pedido && {
    id: pedido.id,
    estado: pedido.estado,
    montoCentavos: pedido.montoCentavos,
    moneda: pedido.moneda,
    paymentIntent: pedido.stripePaymentIntent,
  };
  const decision = decidirPago(pago, esperado);

  switch (decision.accion) {
    case "aplicar": {
      // Condicionado al estado: dos webhooks simultáneos no aplican el pago dos veces.
      const { data } = await db()
        .from("mia_pedidos")
        .update({
          estado: "pagado",
          stripe_payment_intent: pago.paymentIntent,
          stripe_session_id: pago.sessionId,
          pagado_en: new Date().toISOString(),
          motivo_revision: null,
        })
        .eq("id", decision.pedidoId)
        .in("estado", ESTADOS_PAGABLES)
        .select("id");
      await aprovisionar(decision.pedidoId);
      // Conversión deduplicada: solo cuando ESTE evento fue el que aplicó el pago (no en reintentos).
      if (data?.length) await registrarEvento("purchase_confirmed", { nivel: pedido?.nivel ?? "desconocido" });
      return { resultado: data?.length ? "aplicado" : "ya_aplicado", pedidoId: decision.pedidoId };
    }
    case "duplicado":
      await aprovisionar(decision.pedidoId); // reintenta si la cuenta quedó a medias
      return { resultado: "duplicado", pedidoId: decision.pedidoId };
    case "pago_extra":
      await db()
        .from("mia_pedidos")
        .update({ motivo_revision: `pago_extra:${pago.paymentIntent ?? pago.sessionId}` })
        .eq("id", decision.pedidoId);
      return { resultado: "pago_extra", pedidoId: decision.pedidoId };
    case "revision":
      await db()
        .from("mia_pedidos")
        .update({ estado: "revision", motivo_revision: decision.motivo })
        .eq("id", decision.pedidoId)
        .in("estado", ESTADOS_PAGABLES);
      return { resultado: `revision:${decision.motivo}`, pedidoId: decision.pedidoId };
    case "esperar":
      return { resultado: `espera:${decision.motivo}`, pedidoId: pago.pedidoId };
    case "sin_pedido":
      return { resultado: `sin_pedido:${decision.motivo}`, pedidoId: null };
  }
}

/** Marca un pedido que NO está pagado. Un pago confirmado nunca retrocede por esto. */
export async function marcarNoPagado(
  pedidoId: string,
  estado: "fallido" | "abandonado",
  sessionId?: string,
): Promise<void> {
  let q = db()
    .from("mia_pedidos")
    .update({ estado })
    .eq("id", pedidoId)
    .in("estado", ["pendiente", "fallido", "abandonado"]);
  // Una sesión vieja que se cerró al cambiar de nivel no debe marcar como abandonado el pedido vigente.
  if (sessionId) q = q.eq("stripe_session_id", sessionId);
  await q;
}

/* ============================================================
   Aprovisionamiento: cuenta + inscripción + correo de acceso
   ============================================================ */

/** Idempotente: si ya se hizo, no hace nada; si quedó a medias, lo completa. */
export async function aprovisionar(pedidoId: string): Promise<void> {
  const pedido = await obtenerPedido(pedidoId);
  if (!pedido || pedido.estado !== "pagado" || pedido.aprovisionadoEn) return;

  const admin = db();
  try {
    const cohorte = (await listarCohortes()).find((c) => c.activa);
    if (!cohorte) throw new Error("No hay una cohorte activa.");

    const { userId } = await altaAlumno({
      nombre: pedido.nombre,
      email: pedido.email,
      whatsapp: pedido.whatsapp ?? undefined,
      entrada: pedido.nivel,
      cohorteId: cohorte.id,
    });

    // El comprador ya aceptó el aviso de privacidad antes de pagar: se copia al perfil.
    const { data: ped } = await admin.from("mia_pedidos").select("privacidad_aceptada_en").eq("id", pedidoId).single();
    if (ped?.privacidad_aceptada_en) {
      await admin
        .from("mia_perfiles")
        .update({ privacidad_aceptada_en: ped.privacidad_aceptada_en })
        .eq("user_id", userId)
        .is("privacidad_aceptada_en", null);
    }

    if (pedido.bonusIncluido) {
      await admin
        .from("mia_inscripciones")
        .update({ bonus_clase_privada: true })
        .eq("user_id", userId)
        .eq("cohorte_id", cohorte.id);
    }

    await admin
      .from("mia_pedidos")
      .update({
        user_id: userId,
        cohorte_id: cohorte.id,
        aprovisionado_en: new Date().toISOString(),
        error_aprovisionamiento: null,
      })
      .eq("id", pedidoId);

    const envio = await enviarAcceso(pedido.email, pedido.nombre, { compra: true });
    if (!envio.ok) {
      // La cuenta ya existe: el correo se puede reenviar desde el panel. No se reintenta el cobro ni el alta.
      await admin.from("mia_pedidos").update({ error_aprovisionamiento: `correo: ${envio.error}` }).eq("id", pedidoId);
      console.error("[comunidad] compra pagada, pero el correo de acceso falló:", envio.error);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error desconocido";
    await admin.from("mia_pedidos").update({ error_aprovisionamiento: msg }).eq("id", pedidoId);
    throw e; // el webhook responde 500 y Stripe reintenta
  }
}

/* ============================================================
   Eventos de Stripe
   ============================================================ */

async function marcarPorPaymentIntent(
  paymentIntent: string | null,
  estado: "reembolsado" | "disputa",
  motivo: string,
): Promise<ResultadoPago> {
  if (!paymentIntent) return { resultado: "sin_payment_intent", pedidoId: null };
  const { data } = await db()
    .from("mia_pedidos")
    .update({ estado, motivo_revision: motivo })
    .eq("stripe_payment_intent", paymentIntent)
    .in("estado", ["pagado", "revision", "disputa"])
    .select("id, user_id, cohorte_id");

  // Política: un reembolso TOTAL o una disputa revocan el derecho de acceso pagado.
  // (El reembolso parcial no cambia el acceso; una disputa ganada se restituye a mano.)
  for (const p of data ?? []) {
    if (p.user_id && p.cohorte_id) {
      await db()
        .from("mia_inscripciones")
        .update({ estado: "revocada" })
        .eq("user_id", p.user_id as string)
        .eq("cohorte_id", p.cohorte_id as string);
    }
  }
  return { resultado: data?.length ? estado : "pedido_desconocido", pedidoId: data?.[0]?.id ?? null };
}

const idDe = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

/**
 * Procesa un evento YA verificado (firma) de Stripe. El evento solo
 * desencadena la acción: el pago se vuelve a leer de la API de Stripe antes
 * de tocar dinero, porque los eventos pueden llegar repetidos o desordenados.
 */
export async function procesarEventoStripe(event: Stripe.Event): Promise<string> {
  const admin = db();

  const { error: errInsert } = await admin
    .from("mia_eventos_stripe")
    .insert({ stripe_event_id: event.id, tipo: event.type, payload: event as unknown as Record<string, unknown> });
  if (errInsert) {
    if (errInsert.code !== "23505") throw new Error(`No se pudo registrar el evento: ${errInsert.message}`);
    const { data } = await admin.from("mia_eventos_stripe").select("procesado_en").eq("stripe_event_id", event.id).single();
    if (data?.procesado_en) return "duplicado"; // ya procesado; si quedó a medias, se reprocesa
  }

  try {
    let r: ResultadoPago;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const sesion = await getStripe().checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id);
        r = await procesarPago(normalizarSesion(sesion));
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        const id = pedidoIdValido(s.metadata?.pedido_id ?? s.client_reference_id);
        if (id) await marcarNoPagado(id, event.type.endsWith("expired") ? "abandonado" : "fallido", s.id);
        r = { resultado: id ? "no_pagado" : "sin_pedido", pedidoId: id };
        break;
      }
      case "charge.refunded": {
        const c = event.data.object as Stripe.Charge;
        const pi = idDe(c.payment_intent);
        if (c.refunded) {
          r = await marcarPorPaymentIntent(pi, "reembolsado", "reembolso_total");
        } else {
          // Un reembolso parcial no cambia el estado de acceso: solo queda anotado.
          const { data } = pi
            ? await admin
                .from("mia_pedidos")
                .update({ motivo_revision: "reembolso_parcial" })
                .eq("stripe_payment_intent", pi)
                .select("id")
            : { data: null };
          r = { resultado: "reembolso_parcial", pedidoId: data?.[0]?.id ?? null };
        }
        break;
      }
      case "charge.dispute.created": {
        const d = event.data.object as Stripe.Dispute;
        r = await marcarPorPaymentIntent(idDe(d.payment_intent), "disputa", `disputa:${d.reason}`);
        break;
      }
      default:
        r = { resultado: `ignorado:${event.type}`, pedidoId: null };
    }
    await admin
      .from("mia_eventos_stripe")
      .update({ resultado: r.resultado, procesado_en: new Date().toISOString(), error: null })
      .eq("stripe_event_id", event.id);
    return r.resultado;
  } catch (e) {
    await admin
      .from("mia_eventos_stripe")
      .update({ error: e instanceof Error ? e.message : "error" })
      .eq("stripe_event_id", event.id);
    throw e;
  }
}
