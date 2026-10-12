import "server-only";
import type Stripe from "stripe";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { enviarAcceso, enviarVerificacionRegistro } from "./correo";
import { MENSAJE_PEDIDO } from "./ofertas";
import {
  decidirPago,
  ESTADOS_PAGABLES,
  pedidoIdValido,
  type EstadoPedido,
  type PagoNormalizado,
  type PedidoEsperado,
} from "./pagos";
import { guardarRegistroPendiente } from "./registro";
import { getStripe, simuladorActivo, stripeConfigurado } from "./stripe";
import { baseUrl } from "./url";
import { registrarEvento } from "./analitica";

export class ConfigPagoError extends Error {}

/**
 * Pedidos de la plataforma.
 *
 * - Todo pedido NUEVO nace de mia_crear_pedido (base de datos, atómico) y pertenece a una cuenta verificada
 *   (user_id), con producto, oferta y snapshot. El precio sale de la oferta en la base, jamás del cliente.
 * - Los pedidos HISTÓRICOS (compra invitada anterior) conservan user_id nulo y se vinculan solo cuando su
 *   propietario verifica el correo (ver vincularPedidosHistoricos). Este módulo NUNCA crea cuentas de auth.
 */

export interface Pedido {
  id: string;
  userId: string | null;
  productoId: string | null;
  ofertaId: string | null;
  email: string;
  nombre: string;
  whatsapp: string | null;
  montoCentavos: number;
  moneda: string;
  estado: EstadoPedido;
  motivoRevision: string | null;
  origen: "web" | "stand";
  nivel: string;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  checkoutUrl: string | null;
  reservadoHasta: string | null;
  aprovisionadoEn: string | null;
  errorAprovisionamiento: string | null;
  pagadoEn: string | null;
  historico: boolean;
  creadoPor: string | null;
  oportunidadId: string | null;
  snapshot: { producto?: { slug?: string; nombre?: string }; oferta?: { slug?: string; nombre?: string; extras?: string[] } } | null;
  createdAt: string;
}

const COLS =
  "id, user_id, producto_id, oferta_id, email, nombre, whatsapp, monto_centavos, moneda, estado, motivo_revision, origen, nivel, " +
  "stripe_session_id, stripe_payment_intent, checkout_url, reservado_hasta, aprovisionado_en, error_aprovisionamiento, pagado_en, " +
  "historico, creado_por, oportunidad_id, snapshot, created_at";

function aPedido(r: Record<string, unknown>): Pedido {
  const s = (k: string) => (r[k] as string | null) ?? null;
  return {
    id: r.id as string,
    userId: s("user_id"),
    productoId: s("producto_id"),
    ofertaId: s("oferta_id"),
    email: r.email as string,
    nombre: r.nombre as string,
    whatsapp: s("whatsapp"),
    montoCentavos: Number(r.monto_centavos),
    moneda: r.moneda as string,
    estado: r.estado as EstadoPedido,
    motivoRevision: s("motivo_revision"),
    origen: r.origen as "web" | "stand",
    nivel: r.nivel as string,
    stripeSessionId: s("stripe_session_id"),
    stripePaymentIntent: s("stripe_payment_intent"),
    checkoutUrl: s("checkout_url"),
    reservadoHasta: s("reservado_hasta"),
    aprovisionadoEn: s("aprovisionado_en"),
    errorAprovisionamiento: s("error_aprovisionamiento"),
    pagadoEn: s("pagado_en"),
    historico: r.historico === true,
    creadoPor: s("creado_por"),
    oportunidadId: s("oportunidad_id"),
    snapshot: (r.snapshot as Pedido["snapshot"]) ?? null,
    createdAt: r.created_at as string,
  };
}

const db = () => createSupabaseServiceRole();

/* ============================================================
   Crear, leer y listar (siempre acotado al dueño cuando es de una cuenta)
   ============================================================ */

export type ResultadoPedido =
  | { ok: true; pedido: Pedido; reanudado: boolean }
  | { ok: false; motivo: string; mensaje: string };

/**
 * Crea (o reanuda) el pedido PROPIO de una cuenta para una oferta. La base valida oferta, ventana, requisitos
 * de upsell, solape y cupos de forma atómica. `userId` debe salir de la sesión verificada, nunca del cliente.
 */
export async function crearOReanudarPedido(
  userId: string,
  ofertaId: string,
  opts: { creadoPor?: string; oportunidadId?: string } = {},
): Promise<ResultadoPedido> {
  const { data, error } = await db().rpc("mia_crear_pedido", {
    p_user: userId,
    p_oferta: ofertaId,
    p_creado_por: opts.creadoPor ?? null,
    p_oportunidad: opts.oportunidadId ?? null,
  });
  if (error) throw new Error(`No se pudo crear el pedido: ${error.message}`);

  const r = data as { estado: string; pedido_id?: string; reanudado?: boolean };
  if (r.estado !== "ok" || !r.pedido_id) {
    return { ok: false, motivo: r.estado, mensaje: MENSAJE_PEDIDO[r.estado] ?? "No se pudo crear el pedido." };
  }
  const pedido = await obtenerPedidoPropio(r.pedido_id, userId);
  if (!pedido) throw new Error("El pedido recién creado no se pudo leer.");
  return { ok: true, pedido, reanudado: r.reanudado === true };
}

/** Un pedido SOLO si pertenece a esa cuenta. Es lo que usan «ver», «reanudar» y «pagar»: nunca por UUID suelto. */
export async function obtenerPedidoPropio(id: string, userId: string): Promise<Pedido | null> {
  const { data } = await db().from("mia_pedidos").select(COLS).eq("id", id).eq("user_id", userId).maybeSingle();
  return data ? aPedido(data as unknown as Record<string, unknown>) : null;
}

/** Sin filtro de dueño: SOLO para el webhook y tareas internas del servidor. */
export async function obtenerPedido(id: string): Promise<Pedido | null> {
  const { data } = await db().from("mia_pedidos").select(COLS).eq("id", id).maybeSingle();
  return data ? aPedido(data as unknown as Record<string, unknown>) : null;
}

export async function listarPedidosDe(userId: string, limite = 50): Promise<Pedido[]> {
  const { data } = await db().from("mia_pedidos").select(COLS).eq("user_id", userId).order("created_at", { ascending: false }).limit(limite);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(aPedido);
}

/** Pedidos sin pagar de la cuenta, por oferta (para ofrecer «Continuar compra»). */
export async function pedidosAbiertosDe(userId: string): Promise<Record<string, string>> {
  const { data } = await db()
    .from("mia_pedidos")
    .select("id, oferta_id")
    .eq("user_id", userId)
    .eq("estado", "pendiente")
    .not("oferta_id", "is", null)
    .order("created_at", { ascending: false });
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as { id: string; oferta_id: string }[]) if (!(r.oferta_id in out)) out[r.oferta_id] = r.id;
  return out;
}

/** Solo admin (la página llama a requireAdminComunidad antes). */
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

/** Libera la reserva si el checkout no se pudo crear (el cupo vuelve a estar disponible ya). */
export async function liberarReserva(pedidoId: string): Promise<void> {
  await db().from("mia_pedidos").update({ reservado_hasta: null }).eq("id", pedidoId).eq("estado", "pendiente");
}

/* ============================================================
   Checkout
   ============================================================ */

/**
 * Enlace de pago del pedido de una cuenta (Stripe Checkout, o el simulador en desarrollo). Reutiliza la sesión
 * abierta si la hay: pagar dos veces el mismo pedido no es posible por dos enlaces vivos.
 */
export async function crearCheckout(pedido: Pedido): Promise<string> {
  if (!pedido.userId) throw new ConfigPagoError("Un pedido sin dueño verificado no se puede cobrar.");
  const base = baseUrl();

  if (stripeConfigurado()) {
    const stripe = getStripe();
    if (pedido.stripeSessionId) {
      const previa = await stripe.checkout.sessions.retrieve(pedido.stripeSessionId).catch(() => null);
      if (previa && previa.status === "open" && previa.url) return previa.url;
    }
    const producto = pedido.snapshot?.producto?.nombre ?? "Programa";
    const oferta = pedido.snapshot?.oferta?.nombre ?? pedido.nivel;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: pedido.moneda,
              // El monto es el del pedido, que salió de la oferta en la base. No viene del navegador.
              unit_amount: pedido.montoCentavos,
              product_data: { name: `${producto} — ${oferta}` },
            },
          },
        ],
        customer_email: pedido.email,
        client_reference_id: pedido.id,
        metadata: { pedido_id: pedido.id },
        payment_intent_data: { metadata: { pedido_id: pedido.id }, description: producto },
        success_url: `${base}/comunidad/gracias?p=${pedido.id}`,
        cancel_url: `${base}/comunidad/pedidos/${pedido.id}?cancelado=1`,
        locale: "es",
        // Mínimo permitido por Stripe: 30 min. Pasado ese tiempo llega checkout.session.expired.
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      },
      // Mismo pedido + misma reserva = misma sesión (un doble clic no crea dos enlaces de pago).
      { idempotencyKey: `mia-ped-${pedido.id}-${pedido.reservadoHasta ?? "sin-reserva"}` },
    );
    if (!session.url) throw new ConfigPagoError("Stripe no devolvió el enlace de pago.");
    await db().from("mia_pedidos").update({ stripe_session_id: session.id, checkout_url: session.url }).eq("id", pedido.id);
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
          reservado_hasta: null,
        })
        .eq("id", decision.pedidoId)
        .in("estado", ESTADOS_PAGABLES)
        .select("id");
      await entregarAcceso(decision.pedidoId);
      // Conversión deduplicada: solo cuando ESTE evento fue el que aplicó el pago (no en reintentos). Sin PII.
      if (data?.length) {
        await registrarEvento("purchase_confirmed", {
          producto: pedido?.snapshot?.producto?.slug ?? "desconocido",
          oferta: pedido?.snapshot?.oferta?.slug ?? pedido?.nivel ?? "desconocida",
        });
      }
      return { resultado: data?.length ? "aplicado" : "ya_aplicado", pedidoId: decision.pedidoId };
    }
    case "duplicado":
      await entregarAcceso(decision.pedidoId); // reintenta si el derecho quedó a medias
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
    .update({ estado, reservado_hasta: null })
    .eq("id", pedidoId)
    .in("estado", ["pendiente", "fallido", "abandonado"]);
  // Una sesión vieja que ya se reemplazó no debe marcar como abandonado el pedido vigente.
  if (sessionId) q = q.eq("stripe_session_id", sessionId);
  await q;
}

/* ============================================================
   Entrega del acceso tras un pago VERIFICADO
   ============================================================ */

/**
 * Concede el derecho del producto/oferta comprados a la cuenta DUEÑA del pedido. No crea cuentas: la cuenta
 * verificada ya existía antes de pagar. Idempotente: si ya se entregó, no hace nada.
 */
export async function entregarAcceso(pedidoId: string): Promise<void> {
  const pedido = await obtenerPedido(pedidoId);
  if (!pedido || pedido.estado !== "pagado" || pedido.aprovisionadoEn) return;

  // Pedido de la compra invitada anterior: sin dueño verificado no se concede nada todavía.
  if (!pedido.userId) {
    await pedirVerificacionDePedidoHistorico(pedido);
    return;
  }
  if (!pedido.ofertaId) throw new Error("El pedido pagado no tiene oferta.");

  const admin = db();
  try {
    const { error } = await admin.rpc("mia_conceder_derecho", {
      p_user: pedido.userId,
      p_oferta: pedido.ofertaId,
      p_pedido: pedido.id,
      p_origen: "pago",
      p_por: null,
      p_motivo: null,
    });
    if (error) throw new Error(`Derecho: ${error.message}`);

    await admin
      .from("mia_pedidos")
      .update({ aprovisionado_en: new Date().toISOString(), error_aprovisionamiento: null })
      .eq("id", pedidoId);

    // El correo es un aviso: si falla, el derecho ya está concedido y NO se vuelve a cobrar nada.
    const envio = await enviarAcceso(pedido.email, pedido.nombre, { compra: true, next: "/comunidad/mis-programas" });
    if (!envio.ok) {
      await admin.from("mia_pedidos").update({ error_aprovisionamiento: `correo: ${envio.error}` }).eq("id", pedidoId);
      console.error("[comunidad] compra pagada, pero el correo de aviso falló:", envio.error);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error desconocido";
    await admin.from("mia_pedidos").update({ error_aprovisionamiento: msg }).eq("id", pedidoId);
    throw e; // el webhook responde 500 y Stripe reintenta
  }
}

/* ============================================================
   Pagos históricos en tránsito (compra invitada anterior a la plataforma)
   ============================================================ */

/**
 * Un pago de la compra invitada que se confirma ahora no tiene cuenta. NO se crea una: se le pide a quien pagó
 * que verifique su correo (flujo de registro normal) y entonces se vincula. Así nadie pierde el pago ni se
 * crea un usuario sin verificar.
 */
async function pedirVerificacionDePedidoHistorico(pedido: Pedido): Promise<void> {
  if (pedido.errorAprovisionamiento === "pendiente_verificacion_correo") return; // ya se avisó
  try {
    const registroId = await guardarRegistroPendiente({
      email: pedido.email.toLowerCase(),
      nombre: pedido.nombre,
      whatsapp: pedido.whatsapp ?? undefined,
      marketing: false,
    });
    const envio = await enviarVerificacionRegistro(pedido.email.toLowerCase(), pedido.nombre, registroId);
    await db()
      .from("mia_pedidos")
      .update({ error_aprovisionamiento: envio.ok ? "pendiente_verificacion_correo" : `correo: ${envio.error}` })
      .eq("id", pedido.id);
  } catch (e) {
    console.error("[comunidad] no se pudo pedir la verificación del pedido histórico:", e);
  }
}

/**
 * Vincula los pedidos históricos YA PAGADOS de un correo a la cuenta que acaba de verificar ese mismo correo,
 * y concede el derecho. `email` debe venir de la identidad verificada, nunca del cliente.
 */
export async function vincularPedidosHistoricos(userId: string, email: string): Promise<number> {
  const { data } = await db()
    .from("mia_pedidos")
    .select("id")
    .eq("historico", true)
    .eq("estado", "pagado")
    .is("user_id", null)
    .eq("email", email.toLowerCase());
  let n = 0;
  for (const p of (data ?? []) as { id: string }[]) {
    const { data: vinculado } = await db()
      .from("mia_pedidos")
      .update({ user_id: userId })
      .eq("id", p.id)
      .is("user_id", null)
      .select("id");
    if (vinculado?.length) {
      await entregarAcceso(p.id);
      n++;
    }
  }
  return n;
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
    .select("id");

  // Política: un reembolso TOTAL o una disputa revocan el derecho que dio ESE pedido.
  // (El reembolso parcial no cambia el acceso; una disputa ganada se restituye a mano.)
  for (const p of data ?? []) {
    await db().from("mia_inscripciones").update({ estado: "revocada" }).eq("pedido_id", p.id as string);
  }
  return { resultado: data?.length ? estado : "pedido_desconocido", pedidoId: data?.[0]?.id ?? null };
}

const idDe = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

/**
 * Procesa un evento YA verificado (firma) de Stripe. El evento solo desencadena la acción: el pago se vuelve a
 * leer de la API de Stripe antes de tocar dinero, porque los eventos pueden llegar repetidos o desordenados.
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
            ? await admin.from("mia_pedidos").update({ motivo_revision: "reembolso_parcial" }).eq("stripe_payment_intent", pi).select("id")
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
