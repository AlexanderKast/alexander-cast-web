import "server-only";
import { getMiembro, type Miembro } from "./auth";
import { obtenerProductoPublicado, ventaAbierta, type Producto } from "./catalogo";
import { ventanaDeOferta, type OfertaVista } from "./ofertas";
import { PRODUCTO_PRINCIPAL } from "./oferta";
import { sanearUtm, UTM_CAMPOS } from "./consentimiento";

/**
 * Datos que comparten las dos landings. Todo lo que afecta a lo que se cobra (ofertas, ventanas, cupos) sale de la
 * base, igual que el checkout: la página no puede prometer un precio o una vigencia que luego no se cumpla.
 */

export type Busqueda = Record<string, string | undefined>;

export interface DatosLanding {
  miembro: Miembro | null;
  producto: Producto | null;
  catalogoCaido: boolean;
  ventaDisponible: boolean;
  cuposDesconocidos: boolean;
  abiertas: OfertaVista[];
  /** Primera oferta abierta con fecha de cierre (si la hay). */
  destacada: OfertaVista | null;
  /** La cuenta ya tiene un derecho vigente sobre este programa. */
  esDueno: boolean;
  utm: Record<string, string>;
  origen: "web" | "stand";
}

export async function cargarDatosLanding(sp: Busqueda): Promise<DatosLanding> {
  const miembro = await getMiembro();

  let producto: Producto | null = null;
  let catalogoCaido = false;
  try {
    producto = await obtenerProductoPublicado(PRODUCTO_PRINCIPAL);
  } catch {
    catalogoCaido = true;
  }
  const venta = producto ? await ventaAbierta(producto.id).catch(() => null) : null;
  const ahora = new Date();
  const abiertas = (venta?.ofertas ?? []).filter((o) => ventanaDeOferta(o, ahora) === "abierta");

  const utm: Record<string, string> = {};
  for (const c of UTM_CAMPOS) {
    const v = sanearUtm(sp[c]);
    if (v) utm[c] = v;
  }

  return {
    miembro,
    producto,
    catalogoCaido,
    ventaDisponible: venta?.abierta === true,
    cuposDesconocidos: venta?.cuposDesconocidos === true,
    abiertas,
    destacada: abiertas.find((o) => o.disponibleHasta) ?? null,
    esDueno: miembro?.derechos.some((d) => d.productoSlug === PRODUCTO_PRINCIPAL) ?? false,
    utm,
    origen: sp.o === "stand" ? "stand" : "web",
  };
}

/** Enlace al registro conservando programa de interés, origen y UTM (saneadas). Nunca lleva datos personales. */
export function enlaceRegistro(extra: Record<string, string | undefined>, sp: Busqueda): string {
  const q = new URLSearchParams();
  q.set("programa", PRODUCTO_PRINCIPAL);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  if (sp.o === "stand") q.set("o", "stand");
  for (const c of UTM_CAMPOS) {
    const v = sanearUtm(sp[c]);
    if (v) q.set(c, v);
  }
  return `/comunidad/registro?${q.toString()}`;
}
