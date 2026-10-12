import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sello firmado para recordar «este navegador creó este pedido».
 * Un UUID NO prueba propiedad: se acompaña de una firma HMAC con caducidad
 * que solo el servidor puede producir, y viaja en una cookie httpOnly.
 */

export const TTL_PEDIDO_MS = 24 * 3600_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firma(cuerpo: string, secreto: string): string {
  return createHmac("sha256", secreto).update(cuerpo).digest("base64url");
}

export function firmarPedido(pedidoId: string, ahoraMs: number, secreto: string, ttlMs = TTL_PEDIDO_MS): string {
  const cuerpo = `${pedidoId.toLowerCase()}.${Math.floor((ahoraMs + ttlMs) / 1000)}`;
  return `${cuerpo}.${firma(cuerpo, secreto)}`;
}

/** Devuelve el id del pedido solo si la firma es válida y no venció. */
export function leerPedidoFirmado(valor: string | undefined | null, secreto: string, ahoraMs: number): string | null {
  if (!valor || valor.length > 200) return null;
  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [id, exp, sig] = partes;
  if (!UUID.test(id) || !/^\d{1,12}$/.test(exp)) return null;

  const esperado = Buffer.from(firma(`${id}.${exp}`, secreto));
  const recibido = Buffer.from(sig);
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) return null;
  if (Number(exp) * 1000 < ahoraMs) return null;
  return id.toLowerCase();
}
