import "server-only";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { ofertaPorSlug, obtenerProductoPublicado } from "./catalogo";
import { crearOReanudarPedido, type ResultadoPedido } from "./pedidos";
import {
  ABIERTAS,
  puedeAsignar,
  puedeCrearPedido,
  puedeGestionar,
  puedeVer,
  transicionManual,
  type Actor,
  type EstadoOportunidad,
  type ResultadoTransicion,
} from "./oportunidades-reglas";
import type { IntencionRegistro } from "./registro";

/**
 * Venta asistida. Una oportunidad está vinculada a una CUENTA (nunca a un correo suelto), a un programa y,
 * opcionalmente, a una oferta. El comercial gestiona SOLO lo asignado, no suplanta usuarios, no concede roles
 * y no marca pagos. «Ganada» la deriva la base cuando se confirma el pago del pedido.
 *
 * Toda función que reciba un `actor` aplica los permisos de oportunidades-reglas.ts antes de leer o escribir
 * (la base refuerza con RLS y triggers, pero el servidor usa service role, así que la autorización va aquí).
 */

const db = () => createSupabaseServiceRole();

export interface Oportunidad {
  id: string;
  userId: string;
  productoId: string;
  productoNombre: string;
  ofertaId: string | null;
  ofertaNombre: string | null;
  estado: EstadoOportunidad;
  asignadoA: string | null;
  asignadoNombre: string | null;
  canal: "whatsapp" | "correo";
  origen: string;
  pedidoId: string | null;
  proximaAccion: string | null;
  contactoAutorizadoEn: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteWhatsapp: string | null;
  createdAt: string;
}

export interface Nota {
  id: string;
  autor: string | null;
  autorNombre: string | null;
  texto: string;
  createdAt: string;
}

const COLS =
  "id, user_id, producto_id, oferta_id, estado, asignado_a, canal, origen, pedido_id, proxima_accion, contacto_autorizado_en, created_at";

type Fila = Record<string, unknown>;

/** Completa nombres de cliente, comercial, programa y oferta con consultas por lote (sin N+1). */
async function enriquecer(filas: Fila[]): Promise<Oportunidad[]> {
  if (filas.length === 0) return [];
  const admin = db();
  const ids = (k: string) => [...new Set(filas.map((f) => f[k] as string | null).filter((x): x is string => Boolean(x)))];

  const usuarios = [...new Set([...ids("user_id"), ...ids("asignado_a")])];
  const [perfiles, productos, ofertas] = await Promise.all([
    admin.from("mia_perfiles").select("user_id, nombre, email, whatsapp").in("user_id", usuarios),
    admin.from("mia_productos").select("id, nombre").in("id", ids("producto_id")),
    ids("oferta_id").length ? admin.from("mia_ofertas").select("id, nombre").in("id", ids("oferta_id")) : Promise.resolve({ data: [] }),
  ]);
  const porId = <T extends { [k: string]: unknown }>(arr: T[] | null, k: string) => new Map((arr ?? []).map((x) => [x[k] as string, x]));
  const per = porId(perfiles.data as Fila[] | null, "user_id");
  const pro = porId(productos.data as Fila[] | null, "id");
  const ofe = porId(ofertas.data as Fila[] | null, "id");

  return filas.map((f) => {
    const cli = per.get(f.user_id as string);
    const com = f.asignado_a ? per.get(f.asignado_a as string) : undefined;
    return {
      id: f.id as string,
      userId: f.user_id as string,
      productoId: f.producto_id as string,
      productoNombre: (pro.get(f.producto_id as string)?.nombre as string) ?? "Programa",
      ofertaId: (f.oferta_id as string | null) ?? null,
      ofertaNombre: f.oferta_id ? ((ofe.get(f.oferta_id as string)?.nombre as string) ?? null) : null,
      estado: f.estado as EstadoOportunidad,
      asignadoA: (f.asignado_a as string | null) ?? null,
      asignadoNombre: (com?.nombre as string) ?? null,
      canal: f.canal as "whatsapp" | "correo",
      origen: f.origen as string,
      pedidoId: (f.pedido_id as string | null) ?? null,
      proximaAccion: (f.proxima_accion as string | null) ?? null,
      contactoAutorizadoEn: f.contacto_autorizado_en as string,
      clienteNombre: (cli?.nombre as string) ?? "—",
      clienteEmail: (cli?.email as string) ?? "—",
      clienteWhatsapp: (cli?.whatsapp as string | null) ?? null,
      createdAt: f.created_at as string,
    };
  });
}

/* ============================================================
   Crear (la cuenta pide un asesor): no reserva cupo, no concede acceso
   ============================================================ */

export interface NuevaOportunidad {
  userId: string; // de la sesión verificada
  productoId: string;
  ofertaId?: string | null;
  canal: "whatsapp" | "correo";
  origen: "web" | "stand";
  utm?: Record<string, string | null>;
  /** Momento en que la persona autorizó ser contactada por este canal. Obligatorio. */
  contactoAutorizadoEn: string;
}

/** Idempotente: una cuenta tiene a lo sumo UNA oportunidad abierta por programa. */
export async function crearOportunidad(n: NuevaOportunidad): Promise<{ id: string; creada: boolean }> {
  const admin = db();
  const abierta = async () =>
    (
      await admin
        .from("mia_oportunidades")
        .select("id")
        .eq("user_id", n.userId)
        .eq("producto_id", n.productoId)
        .in("estado", ABIERTAS)
        .maybeSingle()
    ).data?.id as string | undefined;

  const previa = await abierta();
  if (previa) return { id: previa, creada: false };

  const { data, error } = await admin
    .from("mia_oportunidades")
    .insert({
      user_id: n.userId,
      producto_id: n.productoId,
      oferta_id: n.ofertaId ?? null,
      canal: n.canal,
      origen: n.origen,
      utm_source: n.utm?.utm_source ?? null,
      utm_medium: n.utm?.utm_medium ?? null,
      utm_campaign: n.utm?.utm_campaign ?? null,
      contacto_autorizado_en: n.contactoAutorizadoEn,
    })
    .select("id")
    .single();

  if (error) {
    // Carrera con otra solicitud igual: el índice único deja pasar solo una; se devuelve la existente.
    if (error.code === "23505") {
      const ya = await abierta();
      if (ya) return { id: ya, creada: false };
    }
    throw new Error(`No se pudo crear la oportunidad: ${error.message}`);
  }
  return { id: data.id as string, creada: true };
}

/**
 * Después de verificar el correo: si el registro pidió un asesor (con consentimiento explícito de contacto),
 * se vincula una oportunidad a la cuenta. El programa y la oferta se validan de nuevo contra el catálogo.
 */
export async function crearDesdeIntencion(userId: string, i: IntencionRegistro): Promise<{ id: string; creada: boolean } | null> {
  if (!i.asesor || !i.canal || !i.contactoAutorizadoEn || !i.productoSlug) return null;
  const producto = await obtenerProductoPublicado(i.productoSlug);
  if (!producto) return null;
  const oferta = i.ofertaSlug ? await ofertaPorSlug(producto.id, i.ofertaSlug) : null;
  return crearOportunidad({
    userId,
    productoId: producto.id,
    ofertaId: oferta?.id ?? null,
    canal: i.canal,
    origen: i.origen,
    utm: i.utm,
    contactoAutorizadoEn: i.contactoAutorizadoEn,
  });
}

/* ============================================================
   Leer (acotado por actor)
   ============================================================ */

/** Admin: todas. Comercial: solo las asignadas. Cualquier otro rol: ninguna. */
export async function listarOportunidades(actor: Actor, limite = 300): Promise<Oportunidad[]> {
  let q = db().from("mia_oportunidades").select(COLS).order("created_at", { ascending: false }).limit(limite);
  if (actor.rol === "comercial") q = q.eq("asignado_a", actor.userId);
  else if (actor.rol !== "admin") return [];
  const { data } = await q;
  return enriquecer((data ?? []) as Fila[]);
}

/** Las solicitudes de asesor de la PROPIA cuenta (para «Mi cuenta»). */
export async function oportunidadesDeCuenta(userId: string): Promise<Oportunidad[]> {
  const { data } = await db().from("mia_oportunidades").select(COLS).eq("user_id", userId).order("created_at", { ascending: false });
  return enriquecer((data ?? []) as Fila[]);
}

export async function obtenerOportunidad(actor: Actor, id: string): Promise<{ oportunidad: Oportunidad; notas: Nota[] } | null> {
  const { data } = await db().from("mia_oportunidades").select(COLS).eq("id", id).maybeSingle();
  if (!data) return null;
  const [op] = await enriquecer([data as Fila]);
  if (!puedeVer(actor, { userId: op.userId, asignadoA: op.asignadoA, estado: op.estado })) return null;

  // Las notas son internas: solo quien gestiona la oportunidad las ve (no el cliente).
  if (!puedeGestionar(actor, { userId: op.userId, asignadoA: op.asignadoA, estado: op.estado })) return { oportunidad: op, notas: [] };

  const { data: notas } = await db()
    .from("mia_oportunidad_notas")
    .select("id, autor, texto, created_at")
    .eq("oportunidad_id", id)
    .order("created_at", { ascending: false });
  const autores = [...new Set(((notas ?? []) as Fila[]).map((n) => n.autor as string | null).filter((x): x is string => Boolean(x)))];
  const { data: per } = autores.length ? await db().from("mia_perfiles").select("user_id, nombre").in("user_id", autores) : { data: [] };
  const nombre = new Map(((per ?? []) as Fila[]).map((p) => [p.user_id as string, p.nombre as string]));
  return {
    oportunidad: op,
    notas: ((notas ?? []) as Fila[]).map((n) => ({
      id: n.id as string,
      autor: (n.autor as string | null) ?? null,
      autorNombre: n.autor ? (nombre.get(n.autor as string) ?? null) : null,
      texto: n.texto as string,
      createdAt: n.created_at as string,
    })),
  };
}

/** Comerciales y admins que pueden recibir una asignación. */
export async function listarAsignables(): Promise<{ userId: string; nombre: string; rol: string }[]> {
  const { data } = await db().from("mia_perfiles").select("user_id, nombre, rol").in("rol", ["comercial", "admin"]).order("nombre");
  return ((data ?? []) as Fila[]).map((p) => ({ userId: p.user_id as string, nombre: p.nombre as string, rol: p.rol as string }));
}

/* ============================================================
   Gestionar (siempre con autorización)
   ============================================================ */

type Resultado = { ok: true } | { ok: false; motivo: string };

async function cargarLite(id: string) {
  const { data } = await db().from("mia_oportunidades").select("user_id, asignado_a, estado, oferta_id, pedido_id").eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    userId: data.user_id as string,
    asignadoA: (data.asignado_a as string | null) ?? null,
    estado: data.estado as EstadoOportunidad,
    ofertaId: (data.oferta_id as string | null) ?? null,
  };
}

export async function cambiarEstado(actor: Actor, id: string, destino: EstadoOportunidad): Promise<Resultado> {
  const o = await cargarLite(id);
  if (!o) return { ok: false, motivo: "No encontramos la oportunidad." };
  const r: ResultadoTransicion = transicionManual(actor, o, destino);
  if (!r.ok) return r;
  const { error } = await db().from("mia_oportunidades").update({ estado: destino }).eq("id", id).eq("estado", o.estado);
  return error ? { ok: false, motivo: "No se pudo actualizar (¿cambió mientras tanto?)." } : { ok: true };
}

export async function asignarComercial(actor: Actor, id: string, comercialId: string): Promise<Resultado> {
  if (!puedeAsignar(actor)) return { ok: false, motivo: "Solo un administrador asigna oportunidades." };
  const o = await cargarLite(id);
  if (!o) return { ok: false, motivo: "No encontramos la oportunidad." };
  if (!ABIERTAS.includes(o.estado)) return { ok: false, motivo: "La oportunidad ya está cerrada." };

  const { data: dest } = await db().from("mia_perfiles").select("rol").eq("user_id", comercialId).maybeSingle();
  if (!dest || (dest.rol !== "comercial" && dest.rol !== "admin")) {
    return { ok: false, motivo: "Esa persona no es comercial." };
  }
  const { error } = await db()
    .from("mia_oportunidades")
    .update({ asignado_a: comercialId, estado: o.estado === "nueva" ? "asignada" : o.estado })
    .eq("id", id);
  return error ? { ok: false, motivo: "No se pudo asignar." } : { ok: true };
}

export async function agregarNota(actor: Actor, id: string, texto: string): Promise<Resultado> {
  const o = await cargarLite(id);
  if (!o || !puedeGestionar(actor, o)) return { ok: false, motivo: "No puedes gestionar esta oportunidad." };
  const limpio = texto.trim().slice(0, 2000);
  if (!limpio) return { ok: false, motivo: "La nota está vacía." };
  const { error } = await db().from("mia_oportunidad_notas").insert({ oportunidad_id: id, autor: actor.userId, texto: limpio });
  return error ? { ok: false, motivo: "No se pudo guardar la nota." } : { ok: true };
}

/** Fija la oferta que se le propondrá al cliente (debe pertenecer al programa de la oportunidad). */
export async function fijarOferta(actor: Actor, id: string, ofertaId: string): Promise<Resultado> {
  const o = await cargarLite(id);
  if (!o || !puedeGestionar(actor, o)) return { ok: false, motivo: "No puedes gestionar esta oportunidad." };
  if (!ABIERTAS.includes(o.estado)) return { ok: false, motivo: "La oportunidad ya está cerrada." };
  const { data: opp } = await db().from("mia_oportunidades").select("producto_id").eq("id", id).maybeSingle();
  const { data: oferta } = await db().from("mia_ofertas").select("producto_id").eq("id", ofertaId).maybeSingle();
  if (!opp || !oferta || opp.producto_id !== oferta.producto_id) return { ok: false, motivo: "Esa oferta no es del programa de la oportunidad." };
  const { error } = await db().from("mia_oportunidades").update({ oferta_id: ofertaId }).eq("id", id);
  return error ? { ok: false, motivo: "No se pudo guardar la oferta." } : { ok: true };
}

/**
 * Crea (o reanuda) el pedido PROPIO del cliente para la oferta de la oportunidad. El pedido pertenece a la cuenta
 * del cliente: él se autentica y paga; el asesor nunca inicia sesión en su nombre. Cerrar la venta no equivale a
 * pago: la oportunidad pasa a «pendiente_pago» y solo queda «ganada» cuando Stripe confirma.
 */
export async function generarPedido(
  actor: Actor,
  id: string,
): Promise<{ ok: true; pedidoId: string } | { ok: false; motivo: string }> {
  const o = await cargarLite(id);
  if (!o) return { ok: false, motivo: "No encontramos la oportunidad." };
  const permiso = puedeCrearPedido(actor, o);
  if (!permiso.ok) return permiso;

  const r: ResultadoPedido = await crearOReanudarPedido(o.userId, o.ofertaId as string, {
    creadoPor: actor.userId,
    oportunidadId: id,
  });
  if (!r.ok) return { ok: false, motivo: r.mensaje };

  await db()
    .from("mia_oportunidades")
    .update({ pedido_id: r.pedido.id, estado: "pendiente_pago" })
    .eq("id", id)
    .in("estado", ABIERTAS);
  return { ok: true, pedidoId: r.pedido.id };
}
