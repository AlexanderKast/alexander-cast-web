/**
 * Ofertas del catálogo: qué puede hacer una cuenta con cada una (lógica pura, sin IO).
 *
 * La AUTORIDAD final está en la base (mia_crear_pedido valida todo de forma atómica); esto solo decide
 * qué botón mostrar en el detalle del programa. Nunca se usa para autorizar nada.
 */

export interface OfertaVista {
  id: string;
  productoId: string;
  cohorteId: string | null;
  slug: string;
  nombre: string;
  nota: string | null;
  precioCentavos: number;
  moneda: string;
  disponibleDesde: string | null;
  disponibleHasta: string | null;
  cupos: number | null;
  derechos: string[];
  extras: string[];
  requiereProductoId: string | null;
  orden: number;
}

export type VentanaOferta = "abierta" | "proxima" | "cerrada";

export function ventanaDeOferta(o: Pick<OfertaVista, "disponibleDesde" | "disponibleHasta">, ahora: Date): VentanaOferta {
  const t = ahora.getTime();
  if (o.disponibleDesde && t < new Date(o.disponibleDesde).getTime()) return "proxima";
  if (o.disponibleHasta && t > new Date(o.disponibleHasta).getTime()) return "cerrada";
  return "abierta";
}

export interface ContextoCompra {
  ahora: Date;
  /** Derechos vigentes de la cuenta: producto y cohorte (null si el programa no tiene cohorte). */
  derechos: { productoId: string; cohorteId: string | null }[];
  /** Ofertas para las que la cuenta ya tiene un pedido abierto (sin pagar). */
  pedidosAbiertos: Record<string, string>; // ofertaId → pedidoId
  /** Cupos libres de la oferta; null = no se pudo consultar. */
  cuposLibres: number | null;
}

export type MotivoNoDisponible = "proxima" | "cerrada" | "agotada" | "requisito";

export type AccionOferta =
  | { tipo: "comprar"; cuposSinVerificar: boolean }
  | { tipo: "continuar"; pedidoId: string }
  | { tipo: "adquirido" }
  | { tipo: "no_disponible"; motivo: MotivoNoDisponible };

/**
 * Qué se le ofrece a ESTA cuenta con ESTA oferta. Orden de decisión (igual al de la base):
 * ya adquirido → ventana → requisito de upsell → cupos → continuar/comprar.
 */
export function accionParaOferta(o: OfertaVista, productoRequiereId: string | null, ctx: ContextoCompra): AccionOferta {
  const yaTiene = ctx.derechos.some((d) => d.productoId === o.productoId && d.cohorteId === o.cohorteId);
  if (yaTiene) return { tipo: "adquirido" };

  const ventana = ventanaDeOferta(o, ctx.ahora);
  if (ventana !== "abierta") return { tipo: "no_disponible", motivo: ventana };

  const requerido = o.requiereProductoId ?? productoRequiereId;
  if (requerido && !ctx.derechos.some((d) => d.productoId === requerido)) {
    return { tipo: "no_disponible", motivo: "requisito" };
  }

  const abierto = ctx.pedidosAbiertos[o.id];
  if (ctx.cuposLibres !== null && ctx.cuposLibres <= 0 && !abierto) {
    return { tipo: "no_disponible", motivo: "agotada" };
  }

  if (abierto) return { tipo: "continuar", pedidoId: abierto };
  return { tipo: "comprar", cuposSinVerificar: ctx.cuposLibres === null };
}

export const MENSAJE_NO_DISPONIBLE: Record<MotivoNoDisponible, string> = {
  proxima: "Esta oferta todavía no está disponible.",
  cerrada: "Esta oferta ya cerró.",
  agotada: "Los cupos de esta oferta se agotaron.",
  requisito: "Para esta oferta necesitas tener antes el programa base.",
};

/** Mensajes de la base (mia_crear_pedido) para mostrar al usuario. */
export const MENSAJE_PEDIDO: Record<string, string> = {
  oferta_no_disponible: "Esta oferta ya no está disponible.",
  oferta_cerrada: "Esta oferta ya cerró o todavía no abre.",
  sin_perfil: "Necesitas una cuenta de la plataforma para comprar.",
  privacidad_pendiente: "Primero acepta el tratamiento de datos para continuar.",
  requisito_no_cumplido: "Para esta oferta necesitas tener antes el programa base.",
  ya_adquirido: "Ya tienes este programa. Lo encuentras en «Mis programas».",
  sin_cupo: "Los cupos de esta oferta se agotaron.",
};
