import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { baseUrl } from "@/lib/comunidad/url";
import { correoAccesoPortal } from "./correo";
import type { PlanId } from "@/content/imt";
import type { Periodo } from "./pagos";
import { escaparLike, esTipoToken, slugify, sufijoSlug, type TipoToken } from "./portal-utils";
import { getImtStripe } from "./stripe";

/*
 * Portal de clientes de IA Master Tech. Cada comprador tiene un portal creado al pagar
 * y entra con un enlace mágico enviado a su correo (sin contraseña).
 */

export type PedidoParaPortal = {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
};

type ClienteFila = { id: string; slug: string };

/** Enlace de acceso de un solo uso (el token lo genera Supabase; el correo lo enviamos nosotros). */
export function urlAcceso(tokenHash: string, tipo: TipoToken = "magiclink", base: string = baseUrl()): string {
  const url = new URL(`${base}/portal/entrar`);
  url.searchParams.set("t", tokenHash);
  url.searchParams.set("type", tipo);
  return url.toString();
}

/** Token de acceso listo para enviarse por correo. */
export type AccesoPortal = { tokenHash: string; tipo: TipoToken };

/**
 * Genera el token del enlace mágico para un correo. Crea el usuario de Supabase si no existe
 * (ya confirmado: el correo se verifica justamente al abrir el enlace que le llega).
 * Cada llamada invalida el enlace anterior de esa persona: úsala solo cuando se vaya a enviar.
 */
export async function generarTokenAcceso(
  db: SupabaseClient,
  email: string,
): Promise<{ userId: string; tokenHash: string; tipo: TipoToken }> {
  const crear = await db.auth.admin.createUser({ email, email_confirm: true });
  // "ya existe" no es un error para nosotros: el usuario se obtiene al generar el enlace.
  if (crear.error && !/already|exists|registered/i.test(`${crear.error.code ?? ""} ${crear.error.message}`)) {
    throw new Error(`No se pudo crear el usuario del portal: ${crear.error.message}`);
  }

  const enlace = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = enlace.data?.properties?.hashed_token;
  const userId = enlace.data?.user?.id;
  if (enlace.error || !tokenHash || !userId) {
    throw new Error(`No se pudo generar el enlace de acceso: ${enlace.error?.message ?? "respuesta vacía"}`);
  }
  const tipo = esTipoToken(enlace.data?.properties?.verification_type) ? enlace.data.properties.verification_type : "magiclink";
  return { userId, tokenHash, tipo };
}

async function crearClienteImt(db: SupabaseClient, p: PedidoParaPortal): Promise<ClienteFila> {
  const base = slugify(p.empresa);
  for (let intento = 0; intento < 6; intento++) {
    const slug = intento === 0 ? base : `${base.slice(0, 40)}-${sufijoSlug()}`;
    const { data, error } = await db
      .from("portal_clients")
      .insert({ nombre: p.empresa, slug, contacto_email: p.email, contacto_nombre: p.nombre, tipo: "imt" })
      .select("id, slug")
      .maybeSingle<ClienteFila>();
    if (data) return data;
    // 23505 = choque de slug: se reintenta con sufijo.
    if (error?.code !== "23505") throw new Error(`No se pudo crear el portal de ${p.empresa}: ${error?.message}`);
  }
  throw new Error(`No se pudo reservar un slug para el portal de ${p.empresa}`);
}

/**
 * Crea (o reutiliza) el portal de IMT de un comprador y lo vincula al pedido. Idempotente:
 * un reintento del webhook no duplica clientes, usuarios ni correos. El enlace de acceso solo
 * se devuelve cuando el usuario se acaba de vincular, que es cuando hay que enviarlo.
 */
export async function aprovisionarPortal(
  db: SupabaseClient,
  pedido: PedidoParaPortal,
): Promise<{ clientId: string; slug: string; acceso: AccesoPortal | null }> {
  const email = pedido.email.trim().toLowerCase();

  // ¿Esta persona ya tiene un portal de IMT? (renovación o segundo plan: se reutiliza)
  const { data: previos, error: errorPrevios } = await db
    .from("portal_client_users")
    .select("client_id, portal_clients(id, slug, tipo)")
    .ilike("email", escaparLike(email))
    .eq("activo", true);
  if (errorPrevios) throw new Error(`No se pudo buscar el portal de ${email}: ${errorPrevios.message}`);

  type Vinculo = { client_id: string; portal_clients: { id: string; slug: string; tipo: string } | { id: string; slug: string; tipo: string }[] | null };
  const existente = ((previos ?? []) as unknown as Vinculo[])
    .map((v) => (Array.isArray(v.portal_clients) ? v.portal_clients[0] : v.portal_clients))
    .find((c) => c?.tipo === "imt");

  let cliente: ClienteFila;
  let acceso: AccesoPortal | null = null;

  if (existente) {
    cliente = { id: existente.id, slug: existente.slug };
  } else {
    cliente = await crearClienteImt(db, { ...pedido, email });
    const token = await generarTokenAcceso(db, email);
    acceso = { tokenHash: token.tokenHash, tipo: token.tipo };
    const { error } = await db.from("portal_client_users").insert({
      auth_user_id: token.userId,
      client_id: cliente.id,
      email,
      nombre: pedido.nombre,
      rol: "viewer",
    });
    // 23505 = la pareja usuario-cliente ya existía (carrera): no es un fallo.
    if (error && error.code !== "23505") throw new Error(`No se pudo vincular al usuario del portal: ${error.message}`);
  }

  const { error: errorPedido } = await db.from("imt_pedidos").update({ portal_client_id: cliente.id }).eq("id", pedido.id);
  if (errorPedido) throw new Error(`No se pudo vincular el pedido ${pedido.id} a su portal: ${errorPedido.message}`);

  return { clientId: cliente.id, slug: cliente.slug, acceso };
}

/** Envía el correo con el enlace de acceso. Mejor esfuerzo: nunca lanza. */
export async function enviarAccesoPortal(p: {
  email: string;
  nombre: string;
  tokenHash: string;
  tipo?: TipoToken;
  base?: string;
  bienvenida: boolean;
}): Promise<boolean> {
  const r = await correoAccesoPortal({
    to: p.email,
    nombre: p.nombre,
    enlace: urlAcceso(p.tokenHash, p.tipo, p.base),
    bienvenida: p.bienvenida,
  });
  if (!r.ok) console.error("[imt-portal] correo de acceso no enviado:", r.error);
  return r.ok;
}

/**
 * Pide un enlace nuevo para un correo ya registrado en un portal activo.
 * Devuelve false (sin revelar nada) si ese correo no tiene portal.
 */
export async function reenviarAcceso(db: SupabaseClient, emailCrudo: string, base?: string): Promise<boolean> {
  const email = emailCrudo.trim().toLowerCase();
  const { data, error } = await db
    .from("portal_client_users")
    .select("nombre")
    .ilike("email", escaparLike(email))
    .eq("activo", true)
    .limit(1);
  if (error) throw new Error(`No se pudo comprobar el acceso de ${email}: ${error.message}`);
  const fila = Array.isArray(data) ? (data[0] as { nombre: string | null } | undefined) : undefined;
  if (!fila) return false;

  const { tokenHash, tipo } = await generarTokenAcceso(db, email);
  return enviarAccesoPortal({ email, nombre: fila.nombre ?? "", tokenHash, tipo, base, bienvenida: false });
}

/* ───────────────────────── Datos del panel del cliente ───────────────────────── */

export type PlanCliente = {
  id: string;
  plan: PlanId;
  periodo: Periodo;
  importeCop: number;
  estado: string;
  suscripcionEstado: string | null;
  pagadoAt: string | null;
  minimoHasta: string | null;
  /** El contrato mínimo todavía no se cumple (calculado aquí, no al pintar la página). */
  minimoVigente: boolean;
  tienePago: boolean;
};

export type CobroCliente = { pedidoId: string; montoCop: number; pagadoAt: string };

export async function cargarPanelCliente(
  db: SupabaseClient,
  clientId: string,
): Promise<{ planes: PlanCliente[]; cobros: CobroCliente[] }> {
  const { data: pedidos, error } = await db
    .from("imt_pedidos")
    .select("id, plan, periodo, importe_cop, estado, suscripcion_estado, pagado_at, minimo_hasta, stripe_customer_id")
    .eq("portal_client_id", clientId)
    .in("estado", ["pagado", "reembolsado"])
    .order("pagado_at", { ascending: false });
  if (error) throw new Error(`No se pudo leer los planes del cliente: ${error.message}`);

  type Fila = {
    id: string;
    plan: PlanId;
    periodo: Periodo;
    importe_cop: number;
    estado: string;
    suscripcion_estado: string | null;
    pagado_at: string | null;
    minimo_hasta: string | null;
    stripe_customer_id: string | null;
  };
  const filas = (pedidos ?? []) as Fila[];
  const planes: PlanCliente[] = filas.map((f) => ({
    id: f.id,
    plan: f.plan,
    periodo: f.periodo,
    importeCop: f.importe_cop,
    estado: f.estado,
    suscripcionEstado: f.suscripcion_estado,
    pagadoAt: f.pagado_at,
    minimoHasta: f.minimo_hasta,
    minimoVigente: f.minimo_hasta !== null && new Date(f.minimo_hasta).getTime() > Date.now(),
    tienePago: Boolean(f.stripe_customer_id),
  }));

  if (filas.length === 0) return { planes, cobros: [] };

  const { data: cobros, error: errorCobros } = await db
    .from("imt_cobros")
    .select("pedido_id, monto_cop, pagado_at")
    .in(
      "pedido_id",
      filas.map((f) => f.id),
    )
    .order("pagado_at", { ascending: false })
    .limit(36);
  if (errorCobros) throw new Error(`No se pudo leer los cobros del cliente: ${errorCobros.message}`);

  return {
    planes,
    cobros: ((cobros ?? []) as { pedido_id: string; monto_cop: number; pagado_at: string }[]).map((c) => ({
      pedidoId: c.pedido_id,
      montoCop: c.monto_cop,
      pagadoAt: c.pagado_at,
    })),
  };
}

/**
 * Abre el portal de facturación de Stripe (tarjeta y facturas) para el pedido pagado más reciente
 * del cliente. La cancelación se desactiva en la configuración del portal en Stripe, no aquí.
 */
export async function crearSesionFacturacion(
  db: SupabaseClient,
  clientId: string,
  slug: string,
  base: string = baseUrl(),
): Promise<string | null> {
  const { data, error } = await db
    .from("imt_pedidos")
    .select("stripe_customer_id")
    .eq("portal_client_id", clientId)
    .eq("estado", "pagado")
    .not("stripe_customer_id", "is", null)
    .order("pagado_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`No se pudo leer el cliente de Stripe: ${error.message}`);
  const cliente = Array.isArray(data) ? (data[0] as { stripe_customer_id: string } | undefined)?.stripe_customer_id : undefined;
  if (!cliente) return null;

  const configuracion = process.env.IMT_STRIPE_PORTAL_CONFIGURATION || undefined;
  const sesion = await getImtStripe().billingPortal.sessions.create({
    customer: cliente,
    return_url: `${base}/portal/${slug}`,
    ...(configuracion ? { configuration: configuracion } : {}),
  });
  return sesion.url;
}
