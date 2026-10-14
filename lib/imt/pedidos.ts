import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCop, planName, type PlanId } from "@/content/imt";
import { baseUrl } from "@/lib/comunidad/url";
import { correoComisionGenerada, correoPagoConfirmado, correoVentaEquipo } from "./correo";
import {
  aMenorUnidad,
  COMISION_PCT,
  decidirComision,
  deMenorUnidad,
  importeCop,
  minimoHasta,
  normalizarCodigo,
  type CheckoutInput,
  type Periodo,
} from "./pagos";
import { getImtStripe } from "./stripe";

/* ───────────────────────── Checkout ───────────────────────── */

export class ErrorCheckout extends Error {
  constructor(
    message: string,
    readonly estado: number = 500,
  ) {
    super(message);
  }
}

type ReferidorFila = { id: string; estado: string; email: string; codigo: string };

async function buscarReferidor(db: SupabaseClient, crudo: string | null | undefined): Promise<ReferidorFila | null> {
  const codigo = normalizarCodigo(crudo);
  if (!codigo) return null;
  const { data } = await db
    .from("imt_referidores")
    .select("id, estado, email, codigo")
    .eq("codigo", codigo)
    .maybeSingle<ReferidorFila>();
  return data ?? null;
}

/**
 * Crea el pedido pendiente y la sesión de Stripe Checkout.
 * Mensual = suscripción; anual = pago único (10 meses por 12).
 * El importe lo decide SIEMPRE el servidor a partir del catálogo.
 */
export async function crearCheckout(
  db: SupabaseClient,
  input: CheckoutInput,
  refCodigo: string | null,
): Promise<{ url: string; pedidoId: string }> {
  const referidor = await buscarReferidor(db, refCodigo);
  const importe = importeCop(input.plan, input.periodo);

  const { data: pedido, error } = await db
    .from("imt_pedidos")
    .insert({
      plan: input.plan,
      periodo: input.periodo,
      importe_cop: importe,
      nombre: input.nombre,
      empresa: input.empresa,
      email: input.email,
      whatsapp: input.whatsapp,
      consentimiento: true,
      referidor_id: referidor?.id ?? null,
      ref_codigo: referidor?.codigo ?? null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !pedido) {
    console.error("[imt-pagos] no se pudo crear el pedido:", error?.message);
    throw new ErrorCheckout("No pudimos iniciar el pago. Intenta de nuevo.");
  }

  const nombrePlan = planName(input.plan);
  const mensual = input.periodo === "mensual";
  const base = baseUrl();
  const metadata = { imt_pedido_id: pedido.id, plan: input.plan, periodo: input.periodo };

  try {
    const sesion = await getImtStripe().checkout.sessions.create(
      {
        mode: mensual ? "subscription" : "payment",
        locale: "es",
        customer_email: input.email,
        client_reference_id: pedido.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "cop",
              unit_amount: aMenorUnidad(importe),
              product_data: {
                name: `IA Master Tech · Plan ${nombrePlan}${mensual ? " (mensual)" : " (anual, 12 meses por 10)"}`,
                description: mensual
                  ? "Fee mensual de desarrollo y automatización. Contrato mínimo de 3 meses."
                  : "Pago anual: 10 meses pagados, 12 meses de servicio.",
              },
              ...(mensual ? { recurring: { interval: "month" as const } } : {}),
            },
          },
        ],
        metadata,
        ...(mensual
          ? { subscription_data: { metadata } }
          : { payment_intent_data: { metadata } }),
        success_url: `${base}/contratar/gracias?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/contratar?plan=${input.plan}&periodo=${input.periodo}&cancelado=1`,
      },
      { idempotencyKey: `imt-pedido-${pedido.id}` },
    );

    if (!sesion.url) throw new Error("Stripe no devolvió la URL del checkout");

    await db.from("imt_pedidos").update({ stripe_session_id: sesion.id }).eq("id", pedido.id);
    return { url: sesion.url, pedidoId: pedido.id };
  } catch (e) {
    console.error("[imt-pagos] Stripe rechazó la sesión:", e instanceof Error ? e.message : e);
    await db.from("imt_pedidos").update({ estado: "fallido" }).eq("id", pedido.id);
    throw new ErrorCheckout("No pudimos abrir el pago. Intenta de nuevo o escríbenos por WhatsApp.");
  }
}

/* ───────────────────────── Webhook ───────────────────────── */

type Objeto = Record<string, unknown>;

function leer(obj: unknown, ...ruta: string[]): unknown {
  let actual: unknown = obj;
  for (const clave of ruta) {
    if (actual === null || typeof actual !== "object") return undefined;
    actual = (actual as Objeto)[clave];
  }
  return actual;
}

function idDe(valor: unknown): string | null {
  if (typeof valor === "string" && valor) return valor;
  const id = leer(valor, "id");
  return typeof id === "string" && id ? id : null;
}

/** Metadata imt_pedido_id de un objeto de Stripe (sesión, suscripción o factura). */
function pedidoIdDe(obj: unknown): string | null {
  const candidatos = [
    leer(obj, "metadata", "imt_pedido_id"),
    leer(obj, "parent", "subscription_details", "metadata", "imt_pedido_id"),
    leer(obj, "subscription_details", "metadata", "imt_pedido_id"),
  ];
  const hallado = candidatos.find((c) => typeof c === "string" && c);
  return typeof hallado === "string" ? hallado : null;
}

type PedidoFila = {
  id: string;
  plan: PlanId;
  periodo: Periodo;
  importe_cop: number;
  estado: string;
  nombre: string;
  empresa: string;
  email: string;
  whatsapp: string;
  referidor_id: string | null;
  pagado_at: string | null;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
};

const COLUMNAS_PEDIDO =
  "id, plan, periodo, importe_cop, estado, nombre, empresa, email, whatsapp, referidor_id, pagado_at, stripe_customer_id, stripe_payment_intent_id";

async function pedidoPorId(db: SupabaseClient, id: string): Promise<PedidoFila | null> {
  const { data } = await db.from("imt_pedidos").select(COLUMNAS_PEDIDO).eq("id", id).maybeSingle<PedidoFila>();
  return data ?? null;
}

const TIPOS_IMT = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.deleted",
  "charge.refunded",
]);

/**
 * ¿El evento es de un pedido de IMT? Sesiones, facturas y suscripciones lo dicen
 * en su metadata. Un reembolso no la trae: se reconoce por su payment_intent o cliente.
 */
async function esDeImt(db: SupabaseClient, evento: Stripe.Event): Promise<boolean> {
  if (!TIPOS_IMT.has(evento.type)) return false;
  const obj = evento.data.object;
  if (evento.type !== "charge.refunded") return pedidoIdDe(obj) !== null;

  const pi = idDe(leer(obj, "payment_intent"));
  const cliente = idDe(leer(obj, "customer"));
  for (const [columna, valor] of [
    ["stripe_payment_intent_id", pi],
    ["stripe_customer_id", cliente],
  ] as const) {
    if (!valor) continue;
    const { data } = await db.from("imt_pedidos").select("id").eq(columna, valor).limit(1);
    if (Array.isArray(data) && data.length > 0) return true;
  }
  return false;
}

/**
 * Procesa un evento YA verificado (firma). Idempotente: el id del evento se
 * guarda primero; un reintento de un evento procesado no hace nada, y uno que
 * falló se reprocesa (los manejadores son seguros de repetir).
 * Lanza si algo falla para que el endpoint responda 500 y Stripe reintente.
 */
export async function procesarEventoImt(db: SupabaseClient, evento: Stripe.Event): Promise<string> {
  // La cuenta de Stripe puede ser compartida con otras apps: lo que no es de IMT
  // se descarta ANTES de guardarlo, para no copiar datos de clientes ajenos aquí.
  if (!(await esDeImt(db, evento))) return "ignorado:ajeno";

  const { data: guardado, error: errorGuardar } = await db
    .from("imt_eventos_stripe")
    .insert({
      stripe_event_id: evento.id,
      tipo: evento.type,
      livemode: evento.livemode,
      payload: evento as unknown as Record<string, unknown>,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  let eventoId: string;
  if (guardado) {
    eventoId = guardado.id;
  } else if (errorGuardar?.code === "23505") {
    const { data: previo } = await db
      .from("imt_eventos_stripe")
      .select("id, estado")
      .eq("stripe_event_id", evento.id)
      .single<{ id: string; estado: string }>();
    if (!previo) throw new Error(`No se pudo leer el evento ${evento.id}`);
    if (previo.estado === "procesado" || previo.estado === "ignorado") return "duplicado";
    eventoId = previo.id;
  } else {
    throw new Error(`No se pudo guardar el evento ${evento.id}: ${errorGuardar?.message ?? "sin detalle"}`);
  }

  try {
    const resultado = await despachar(db, evento);
    await db
      .from("imt_eventos_stripe")
      .update({
        estado: resultado.startsWith("ignorado") ? "ignorado" : "procesado",
        procesado_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", eventoId);
    return resultado;
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await db.from("imt_eventos_stripe").update({ estado: "error", error: mensaje }).eq("id", eventoId);
    throw e;
  }
}

async function despachar(db: SupabaseClient, evento: Stripe.Event): Promise<string> {
  const obj = evento.data.object;
  switch (evento.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return sesionPagada(db, idDe(obj));
    case "checkout.session.async_payment_failed":
      return cerrarPedidoPendiente(db, pedidoIdDe(obj), "fallido");
    case "checkout.session.expired":
      return cerrarPedidoPendiente(db, pedidoIdDe(obj), "expirado");
    case "invoice.paid":
      return facturaPagada(db, obj);
    case "invoice.payment_failed":
      return cambiarSuscripcion(db, pedidoIdDe(obj), "en_mora");
    case "customer.subscription.deleted":
      return cambiarSuscripcion(db, pedidoIdDe(obj), "cancelada");
    case "charge.refunded":
      return reembolso(db, obj as Stripe.Charge);
    default:
      return "ignorado:tipo";
  }
}

async function cerrarPedidoPendiente(
  db: SupabaseClient,
  pedidoId: string | null,
  estado: "fallido" | "expirado",
): Promise<string> {
  if (!pedidoId) return "ignorado:sin_imt";
  const { error } = await db.from("imt_pedidos").update({ estado }).eq("id", pedidoId).eq("estado", "pendiente");
  if (error) throw new Error(`No se pudo marcar el pedido ${pedidoId} como ${estado}: ${error.message}`);
  return estado;
}

async function cambiarSuscripcion(
  db: SupabaseClient,
  pedidoId: string | null,
  estado: "en_mora" | "cancelada",
): Promise<string> {
  if (!pedidoId) return "ignorado:sin_imt";
  const { error } = await db
    .from("imt_pedidos")
    .update({ suscripcion_estado: estado })
    .eq("id", pedidoId)
    .eq("periodo", "mensual");
  if (error) throw new Error(`No se pudo actualizar la suscripción del pedido ${pedidoId}: ${error.message}`);
  return `suscripcion_${estado}`;
}

/**
 * El pago se confirma consultando la sesión a Stripe, no confiando en el
 * cuerpo del evento, y se verifica que importe y moneda coincidan con el pedido.
 */
async function sesionPagada(db: SupabaseClient, sesionId: string | null): Promise<string> {
  if (!sesionId) throw new Error("Evento de sesión sin id");
  const sesion = await getImtStripe().checkout.sessions.retrieve(sesionId);

  const pedidoId = pedidoIdDe(sesion);
  if (!pedidoId) return "ignorado:sin_imt";

  if (sesion.payment_status !== "paid" && sesion.payment_status !== "no_payment_required") {
    return "pendiente_de_pago";
  }

  const pedido = await pedidoPorId(db, pedidoId);
  if (!pedido) throw new Error(`La sesión ${sesion.id} apunta a un pedido inexistente: ${pedidoId}`);

  if (sesion.currency !== "cop" || sesion.amount_total !== aMenorUnidad(pedido.importe_cop)) {
    throw new Error(
      `Importe inesperado en ${sesion.id}: Stripe ${sesion.amount_total} ${sesion.currency}, esperado ${aMenorUnidad(pedido.importe_cop)} cop`,
    );
  }

  const ahora = new Date();
  const subscripcion = idDe(sesion.subscription);
  const { data: actualizado, error } = await db
    .from("imt_pedidos")
    .update({
      estado: "pagado",
      pagado_at: ahora.toISOString(),
      minimo_hasta: minimoHasta(ahora).toISOString(),
      suscripcion_estado: subscripcion ? "activa" : null,
      stripe_customer_id: idDe(sesion.customer),
      stripe_subscription_id: subscripcion,
      stripe_payment_intent_id: idDe(sesion.payment_intent),
    })
    .eq("id", pedido.id)
    .in("estado", ["pendiente", "fallido", "expirado"])
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) throw new Error(`No se pudo marcar pagado el pedido ${pedido.id}: ${error.message}`);
  // Ya estaba pagado: es un reintento. No se repiten comisión ni correos.
  if (!actualizado) return "ya_pagado";

  await registrarCobro(db, pedido.id, idDe(sesion.invoice), pedido.importe_cop, ahora);
  const comision = await generarComision(db, pedido);
  await avisar(pedido, comision);
  if (comision) await avisarReferidor(db, pedido.id);
  return comision ? "pagado_con_comision" : "pagado";
}

async function registrarCobro(
  db: SupabaseClient,
  pedidoId: string,
  facturaId: string | null,
  montoCop: number,
  fecha: Date,
): Promise<void> {
  const fila = { pedido_id: pedidoId, stripe_invoice_id: facturaId, monto_cop: montoCop, pagado_at: fecha.toISOString() };
  // Con factura: único por factura (la primera puede llegar por dos eventos).
  const { error } = facturaId
    ? await db.from("imt_cobros").upsert(fila, { onConflict: "stripe_invoice_id", ignoreDuplicates: true })
    : await db.from("imt_cobros").insert(fila);
  if (error) throw new Error(`No se pudo registrar el cobro del pedido ${pedidoId}: ${error.message}`);
}

async function facturaPagada(db: SupabaseClient, factura: unknown): Promise<string> {
  const pedidoId = pedidoIdDe(factura);
  if (!pedidoId) return "ignorado:sin_imt";
  const facturaId = idDe(factura);
  if (!facturaId) throw new Error("Factura sin id");

  const pedido = await pedidoPorId(db, pedidoId);
  if (!pedido) throw new Error(`La factura ${facturaId} apunta a un pedido inexistente: ${pedidoId}`);

  const pagado = leer(factura, "amount_paid");
  const monto = typeof pagado === "number" ? deMenorUnidad(pagado) : pedido.importe_cop;
  await registrarCobro(db, pedido.id, facturaId, monto, new Date());

  // Un pago a tiempo saca la suscripción de mora.
  await db
    .from("imt_pedidos")
    .update({ suscripcion_estado: "activa" })
    .eq("id", pedido.id)
    .eq("suscripcion_estado", "en_mora");
  return "cobro_registrado";
}

/** Solo el primer pago comisiona (unique por pedido = idempotente). */
async function generarComision(db: SupabaseClient, pedido: PedidoFila): Promise<{ montoCop: number } | null> {
  if (!pedido.referidor_id) return null;
  const { data: referidor } = await db
    .from("imt_referidores")
    .select("id, estado, email")
    .eq("id", pedido.referidor_id)
    .maybeSingle<{ id: string; estado: string; email: string }>();

  const decision = decidirComision({
    referidorId: referidor?.id ?? null,
    referidorActivo: referidor?.estado === "activo",
    emailReferidor: referidor?.email ?? null,
    emailComprador: pedido.email,
    baseCop: pedido.importe_cop,
  });
  if (!decision.aplica || !referidor) return null;

  const { error } = await db.from("imt_comisiones").upsert(
    {
      referidor_id: referidor.id,
      pedido_id: pedido.id,
      base_cop: pedido.importe_cop,
      porcentaje: COMISION_PCT,
      monto_cop: decision.montoCop,
    },
    { onConflict: "pedido_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(`No se pudo crear la comisión del pedido ${pedido.id}: ${error.message}`);
  return { montoCop: decision.montoCop };
}

/** Correos: mejor esfuerzo. El pago ya quedó guardado; un fallo aquí no debe reintentar el evento. */
async function avisar(pedido: PedidoFila, comision: { montoCop: number } | null): Promise<void> {
  const tareas: Promise<unknown>[] = [
    correoPagoConfirmado({
      to: pedido.email,
      nombre: pedido.nombre,
      plan: pedido.plan,
      periodo: pedido.periodo,
      importeCop: pedido.importe_cop,
    }),
    correoVentaEquipo({
      nombre: pedido.nombre,
      empresa: pedido.empresa,
      email: pedido.email,
      whatsapp: pedido.whatsapp,
      plan: pedido.plan,
      periodo: pedido.periodo,
      importeCop: pedido.importe_cop,
      referido: comision ? `comisión de ${formatCop(comision.montoCop)} COP` : null,
    }),
  ];
  const resultados = await Promise.allSettled(tareas);
  for (const r of resultados) {
    if (r.status === "rejected") console.error("[imt-pagos] correo falló:", r.reason);
    else if (r.value && typeof r.value === "object" && "ok" in r.value && !(r.value as { ok: boolean }).ok) {
      console.error("[imt-pagos] correo no enviado:", (r.value as { error?: string }).error);
    }
  }
}

/** Aviso al referidor. Separado porque necesita su token; se llama desde generarComision. */
export async function avisarReferidor(db: SupabaseClient, pedidoId: string): Promise<void> {
  try {
    const { data } = await db
      .from("imt_comisiones")
      .select("monto_cop, imt_referidores(nombre, email, token_panel)")
      .eq("pedido_id", pedidoId)
      .maybeSingle<{ monto_cop: number; imt_referidores: { nombre: string; email: string; token_panel: string } | null }>();
    if (!data?.imt_referidores) return;
    const r = data.imt_referidores;
    await correoComisionGenerada({
      to: r.email,
      nombre: r.nombre,
      montoCop: data.monto_cop,
      panel: `${baseUrl()}/referidos/panel/${r.token_panel}`,
    });
  } catch (e) {
    console.error("[imt-pagos] aviso al referidor falló:", e);
  }
}

/**
 * Reembolso total del primer pago. Anual: se empareja por payment_intent.
 * Mensual: por cliente, mismo importe y fecha cercana al primer pago, para no
 * confundirlo con el reembolso de una renovación.
 */
async function reembolso(db: SupabaseClient, cargo: Stripe.Charge): Promise<string> {
  if (!cargo.refunded) return "ignorado:reembolso_parcial";

  const pi = idDe(cargo.payment_intent);
  const cliente = idDe(cargo.customer);

  let pedido: PedidoFila | null = null;
  if (pi) {
    const { data } = await db
      .from("imt_pedidos")
      .select(COLUMNAS_PEDIDO)
      .eq("stripe_payment_intent_id", pi)
      .maybeSingle<PedidoFila>();
    pedido = data ?? null;
  }
  if (!pedido && cliente) {
    const { data } = await db
      .from("imt_pedidos")
      .select(COLUMNAS_PEDIDO)
      .eq("stripe_customer_id", cliente)
      .eq("estado", "pagado")
      .order("pagado_at", { ascending: false })
      .limit(1)
      .maybeSingle<PedidoFila>();
    if (data && data.pagado_at) {
      const cercano = Math.abs(cargo.created * 1000 - new Date(data.pagado_at).getTime()) < 2 * 24 * 3600 * 1000;
      if (cercano && cargo.amount === aMenorUnidad(data.importe_cop)) pedido = data;
    }
  }
  if (!pedido) return "ignorado:sin_pedido";

  const { error } = await db.from("imt_pedidos").update({ estado: "reembolsado" }).eq("id", pedido.id);
  if (error) throw new Error(`No se pudo marcar reembolsado el pedido ${pedido.id}: ${error.message}`);

  // Comisión sin pagar: se anula. Ya pagada: queda en revisión para recuperarla a mano.
  const anulada = await db
    .from("imt_comisiones")
    .update({ estado: "anulada", notas: "Anulada: el cliente fue reembolsado." })
    .eq("pedido_id", pedido.id)
    .eq("estado", "pendiente");
  if (anulada.error) throw new Error(`No se pudo anular la comisión del pedido ${pedido.id}: ${anulada.error.message}`);
  const revision = await db
    .from("imt_comisiones")
    .update({ estado: "en_revision", notas: "Reembolso con la comisión ya pagada: recuperar con el referidor." })
    .eq("pedido_id", pedido.id)
    .eq("estado", "pagada");
  if (revision.error) throw new Error(`No se pudo marcar en revisión la comisión del pedido ${pedido.id}`);
  return "reembolsado";
}
