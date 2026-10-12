"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isSameOriginStrict } from "@/lib/same-origin";
import { PRODUCTO_PRINCIPAL } from "@/lib/comunidad/oferta";
import { requireComercial } from "@/lib/comunidad/auth";
import { uuidValido } from "@/lib/comunidad/acceso";
import { agregarNota, asignarComercial, cambiarEstado, fijarOferta, generarPedido } from "@/lib/comunidad/oportunidades";
import type { Actor, EstadoOportunidad } from "@/lib/comunidad/oportunidades-reglas";
import { baseUrl } from "@/lib/comunidad/url";
import { registrarEvento } from "@/lib/comunidad/analitica";

/**
 * Acciones de la venta asistida. Todas exigen sesión de comercial o admin y vuelven a comprobar los permisos por
 * oportunidad (el comercial gestiona SOLO lo asignado). Ninguna inicia sesión como el cliente, concede roles o
 * marca pagos: el cliente se autentica y paga su propio pedido.
 */

export type EstadoComercial =
  | { status: "idle" }
  | { status: "ok"; message: string; enlace?: string }
  | { status: "error"; message: string };

const ESTADOS: EstadoOportunidad[] = ["nueva", "asignada", "contactada", "propuesta", "pendiente_pago", "ganada", "perdida"];

async function contexto(fd: FormData): Promise<{ actor: Actor; id: string } | EstadoComercial> {
  if (!isSameOriginStrict(await headers())) return { status: "error", message: "Solicitud no válida." };
  const m = await requireComercial();
  const id = fd.get("oportunidad");
  if (!uuidValido(id)) return { status: "error", message: "Oportunidad no válida." };
  return { actor: { userId: m.userId, rol: m.rol }, id };
}

const esError = (c: Awaited<ReturnType<typeof contexto>>): c is EstadoComercial => "status" in c;

function resultado(r: { ok: true } | { ok: false; motivo: string }, id: string, ok: string): EstadoComercial {
  if (!r.ok) return { status: "error", message: r.motivo };
  revalidatePath(`/comunidad/comercial/${id}`);
  revalidatePath("/comunidad/comercial");
  return { status: "ok", message: ok };
}

export async function cambiarEstadoAccion(_p: EstadoComercial, fd: FormData): Promise<EstadoComercial> {
  const c = await contexto(fd);
  if (esError(c)) return c;
  const destino = fd.get("estado");
  if (typeof destino !== "string" || !ESTADOS.includes(destino as EstadoOportunidad)) {
    return { status: "error", message: "Estado no válido." };
  }
  const r = await cambiarEstado(c.actor, c.id, destino as EstadoOportunidad);
  // Oportunidad cualificada = el comercial asignado la lleva a «propuesta» (sin datos personales en el evento).
  if (r.ok && destino === "propuesta") await registrarEvento("qualified_opportunity", { producto: PRODUCTO_PRINCIPAL });
  return resultado(r, c.id, "Estado actualizado.");
}

export async function asignarAccion(_p: EstadoComercial, fd: FormData): Promise<EstadoComercial> {
  const c = await contexto(fd);
  if (esError(c)) return c;
  const comercial = fd.get("comercial");
  if (!uuidValido(comercial)) return { status: "error", message: "Elige a quién asignarla." };
  return resultado(await asignarComercial(c.actor, c.id, comercial), c.id, "Oportunidad asignada.");
}

export async function notaAccion(_p: EstadoComercial, fd: FormData): Promise<EstadoComercial> {
  const c = await contexto(fd);
  if (esError(c)) return c;
  return resultado(await agregarNota(c.actor, c.id, String(fd.get("texto") ?? "")), c.id, "Nota guardada.");
}

export async function ofertaAccion(_p: EstadoComercial, fd: FormData): Promise<EstadoComercial> {
  const c = await contexto(fd);
  if (esError(c)) return c;
  const oferta = fd.get("oferta");
  if (!uuidValido(oferta)) return { status: "error", message: "Elige una oferta." };
  return resultado(await fijarOferta(c.actor, c.id, oferta), c.id, "Oferta guardada.");
}

/** Crea el pedido PROPIO del cliente y devuelve el enlace interno. El cliente inicia sesión y paga él mismo. */
export async function pedidoAccion(_p: EstadoComercial, fd: FormData): Promise<EstadoComercial> {
  const c = await contexto(fd);
  if (esError(c)) return c;
  const r = await generarPedido(c.actor, c.id);
  if (!r.ok) return { status: "error", message: r.motivo };
  revalidatePath(`/comunidad/comercial/${c.id}`);
  return {
    status: "ok",
    message: "Pedido creado en la cuenta del cliente. Compártele este enlace: debe iniciar sesión con su cuenta para pagarlo.",
    enlace: `${baseUrl()}/comunidad/pedidos/${r.pedidoId}`,
  };
}
