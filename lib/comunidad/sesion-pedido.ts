import "server-only";
import { cookies } from "next/headers";
import { firmarPedido, leerPedidoFirmado, TTL_PEDIDO_MS } from "./sello";

/**
 * «Este navegador creó este pedido». El id viaja en una cookie httpOnly FIRMADA
 * con caducidad: un UUID suelto (en una URL, en un formulario) no demuestra
 * propiedad. Sin secreto configurado se falla de forma cerrada (no hay compra).
 */

const NOMBRE = "mia_pedido";

function secreto(): string {
  const s = process.env.COMUNIDAD_COOKIE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta COMUNIDAD_COOKIE_SECRET (o SUPABASE_SERVICE_ROLE_KEY) para firmar el pedido.");
  return s;
}

export async function recordarPedido(pedidoId: string): Promise<void> {
  (await cookies()).set(NOMBRE, firmarPedido(pedidoId, Date.now(), secreto()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/comunidad",
    maxAge: Math.floor(TTL_PEDIDO_MS / 1000),
  });
}

/** Id del pedido que ESTE navegador creó (y no ha vencido), o null. */
export async function pedidoDelNavegador(): Promise<string | null> {
  try {
    const valor = (await cookies()).get(NOMBRE)?.value;
    return leerPedidoFirmado(valor, secreto(), Date.now());
  } catch {
    return null;
  }
}

export async function olvidarPedido(): Promise<void> {
  (await cookies()).delete({ name: NOMBRE, path: "/comunidad" });
}
