import "server-only";
import { createSupabaseServiceRole } from "@/lib/supabase/server";
import type { OfertaVista } from "./ofertas";

/**
 * Lectura del catálogo (productos y ofertas). Se hace con el servidor porque la landing es pública y
 * porque el precio que se muestra debe ser EXACTAMENTE el que usa el cobro (misma tabla).
 * Solo se devuelve lo publicado y activo; nada de borradores.
 */

export interface Producto {
  id: string;
  slug: string;
  nombre: string;
  resumen: string | null;
  tipo: "programa" | "upsell";
  requiereProductoId: string | null;
}

const db = () => createSupabaseServiceRole();

const aProducto = (r: Record<string, unknown>): Producto => ({
  id: r.id as string,
  slug: r.slug as string,
  nombre: r.nombre as string,
  resumen: (r.resumen as string | null) ?? null,
  tipo: r.tipo as "programa" | "upsell",
  requiereProductoId: (r.requiere_producto_id as string | null) ?? null,
});

const COLS_PRODUCTO = "id, slug, nombre, resumen, tipo, requiere_producto_id";

export async function listarProductosPublicados(): Promise<Producto[]> {
  const { data, error } = await db()
    .from("mia_productos")
    .select(COLS_PRODUCTO)
    .eq("estado", "publicado")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(aProducto);
}

export async function obtenerProductoPublicado(slug: string): Promise<Producto | null> {
  const { data, error } = await db().from("mia_productos").select(COLS_PRODUCTO).eq("slug", slug).eq("estado", "publicado").maybeSingle();
  if (error) throw new Error(`No se pudo leer el programa: ${error.message}`);
  return data ? aProducto(data as Record<string, unknown>) : null;
}

const COLS_OFERTA =
  "id, producto_id, cohorte_id, slug, nombre, nota, precio_centavos, moneda, disponible_desde, disponible_hasta, cupos, derechos, extras, requiere_producto_id, orden";

const aOferta = (r: Record<string, unknown>): OfertaVista => ({
  id: r.id as string,
  productoId: r.producto_id as string,
  cohorteId: (r.cohorte_id as string | null) ?? null,
  slug: r.slug as string,
  nombre: r.nombre as string,
  nota: (r.nota as string | null) ?? null,
  precioCentavos: Number(r.precio_centavos),
  moneda: r.moneda as string,
  disponibleDesde: (r.disponible_desde as string | null) ?? null,
  disponibleHasta: (r.disponible_hasta as string | null) ?? null,
  cupos: (r.cupos as number | null) ?? null,
  derechos: (r.derechos as string[] | null) ?? [],
  extras: (r.extras as string[] | null) ?? [],
  requiereProductoId: (r.requiere_producto_id as string | null) ?? null,
  orden: Number(r.orden),
});

/** Ofertas activas de un producto, en el orden en que se muestran. */
export async function ofertasActivas(productoId: string): Promise<OfertaVista[]> {
  const { data, error } = await db()
    .from("mia_ofertas")
    .select(COLS_OFERTA)
    .eq("producto_id", productoId)
    .eq("activa", true)
    .order("orden", { ascending: true });
  if (error) throw new Error(`No se pudieron leer las ofertas: ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map(aOferta);
}

export async function obtenerOferta(id: string): Promise<OfertaVista | null> {
  const { data } = await db().from("mia_ofertas").select(COLS_OFERTA).eq("id", id).maybeSingle();
  return data ? aOferta(data as Record<string, unknown>) : null;
}

export async function ofertaPorSlug(productoId: string, slug: string): Promise<OfertaVista | null> {
  const { data } = await db().from("mia_ofertas").select(COLS_OFERTA).eq("producto_id", productoId).eq("slug", slug).maybeSingle();
  return data ? aOferta(data as Record<string, unknown>) : null;
}

/**
 * Cupos libres de una oferta (el menor entre lo que queda de la cohorte y de la propia oferta).
 * null = no se pudo consultar: quien llame debe decirlo, no aparentar que hay o no hay cupo.
 */
export async function cuposLibres(ofertaId: string, excluirPedidoId?: string): Promise<number | null> {
  const { data, error } = await db().rpc("mia_cupos_libres", {
    p_oferta: ofertaId,
    p_excluir_pedido: excluirPedidoId ?? null,
  });
  if (error) {
    console.error("[comunidad] no se pudo consultar los cupos:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

/**
 * ¿Hay alguna oferta VENDIBLE ahora de este programa? (ventana abierta y con cupo, o cupo sin verificar).
 * Sirve para decidir entre «Crear cuenta para continuar» y «lista de espera». La autoridad al comprar sigue
 * siendo la base de datos.
 */
export async function ventaAbierta(
  productoId: string,
  ahora: Date = new Date(),
): Promise<{ abierta: boolean; ofertas: OfertaVista[]; cuposDesconocidos: boolean }> {
  const { ventanaDeOferta } = await import("./ofertas");
  const ofertas = await ofertasActivas(productoId);
  let desconocidos = false;
  let abierta = false;
  for (const o of ofertas) {
    if (ventanaDeOferta(o, ahora) !== "abierta") continue;
    const libres = await cuposLibres(o.id);
    if (libres === null) {
      desconocidos = true;
      abierta = true;
    } else if (libres > 0) {
      abierta = true;
    }
  }
  return { abierta, ofertas, cuposDesconocidos: desconocidos };
}
