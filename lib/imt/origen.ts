/*
 * Dominio público con el que se arman los enlaces de IMT (retorno de Stripe, correos).
 * Sale del dominio por el que entró la petición, pero SOLO si está en la lista: un
 * Host o X-Forwarded-Host falsificado no puede meter un dominio ajeno en un correo
 * que lleva el token privado de un referidor.
 */

const HOSTS_PERMITIDOS = new Set([
  "www.masteria.cloud",
  "masteria.cloud",
  "www.alexandercast.online",
  "alexandercast.online",
  "localhost",
  "127.0.0.1",
]);

const LOCAL_RE = /^(localhost|127\.0\.0\.1)$/;

function hostDe(valor: string | null): string | null {
  if (!valor) return null;
  // x-forwarded-host puede traer una lista: el primero es el del cliente.
  return valor.split(",")[0]?.trim().toLowerCase() || null;
}

/**
 * @param cabeceras cabeceras de la petición
 * @param respaldo  URL base si el host no es reconocido (normalmente NEXT_PUBLIC_SITE_URL)
 */
export function origenPublico(cabeceras: Pick<Headers, "get">, respaldo: string): string {
  const host = hostDe(cabeceras.get("x-forwarded-host")) ?? hostDe(cabeceras.get("host"));
  if (!host) return respaldo;
  const [nombre] = host.split(":");
  if (!HOSTS_PERMITIDOS.has(nombre)) return respaldo;
  return `${LOCAL_RE.test(nombre) ? "http" : "https"}://${host}`;
}
