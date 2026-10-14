/*
 * Dominio público con el que se arman los enlaces de IMT (retorno de Stripe, correos).
 * Sale del dominio por el que entró la petición, pero SOLO si está en la lista: un
 * Host o X-Forwarded-Host falsificado no puede meter un dominio ajeno en un correo
 * que lleva el token privado de un referidor.
 *
 * El host se valida COMPLETO (nombre y puerto) y el origen se reconstruye solo con
 * las partes validadas. Validar solo el nombre y reusar el host original permitía
 * "www.masteria.cloud:@evil.com", que el parser de URL lee como usuario@evil.com.
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
const HOST_RE = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/;

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
  const crudo = hostDe(cabeceras.get("x-forwarded-host")) ?? hostDe(cabeceras.get("host"));
  const partes = crudo ? HOST_RE.exec(crudo) : null;
  if (!partes) return respaldo;

  const [, nombre, puerto] = partes;
  if (!HOSTS_PERMITIDOS.has(nombre)) return respaldo;

  const local = LOCAL_RE.test(nombre);
  // Un puerto personalizado solo tiene sentido en local.
  if (puerto && !local) return respaldo;
  if (puerto && Number(puerto) > 65535) return respaldo;

  try {
    const origen = new URL(`${local ? "http" : "https"}://${nombre}${puerto ? `:${puerto}` : ""}`);
    // Última comprobación sobre lo que de verdad resolvería el parser.
    if (!HOSTS_PERMITIDOS.has(origen.hostname) || origen.username || origen.password) return respaldo;
    return origen.origin;
  } catch {
    return respaldo;
  }
}
