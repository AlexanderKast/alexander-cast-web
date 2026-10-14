/*
 * Utilidades puras del portal de IMT (sin servidor), para poder probarlas.
 */

const SIN_ACENTOS = /[̀-ͯ]/g;

/** "Tienda Ñandú S.A.S." → "tienda-nandu-s-a-s". Siempre devuelve algo utilizable como slug. */
export function slugify(texto: string): string {
  const base = texto
    .normalize("NFD")
    .replace(SIN_ACENTOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base || "cliente";
}

const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";

/** Sufijo corto para resolver choques de slug: "tienda-demo-k7m2". */
export function sufijoSlug(
  aleatorio: (max: number) => number = (max) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  },
): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALFABETO[aleatorio(ALFABETO.length)];
  return s;
}

/** El token_hash que devuelve Supabase al generar el enlace: solo caracteres seguros y largo razonable. */
export const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{16,200}$/;

export function esTokenHash(valor: unknown): valor is string {
  return typeof valor === "string" && TOKEN_HASH_RE.test(valor);
}

/** Slug de un portal: lo que genera slugify, con o sin sufijo. Se valida antes de usarlo en rutas. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function esSlug(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length <= 64 && SLUG_RE.test(valor);
}

/** El tipo lo decide Supabase al generar el enlace; viaja en la URL, así que se valida contra una lista cerrada. */
export const TIPOS_TOKEN = ["magiclink", "signup"] as const;
export type TipoToken = (typeof TIPOS_TOKEN)[number];

export function esTipoToken(valor: unknown): valor is TipoToken {
  return typeof valor === "string" && (TIPOS_TOKEN as readonly string[]).includes(valor);
}

/**
 * Escapa los comodines de LIKE (`%`, `_`) y la barra para comparar un correo con `ilike` como
 * igualdad EXACTA sin distinguir mayúsculas. Sin esto, "a_b@x.co" coincidiría con "axb@x.co".
 */
export function escaparLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`);
}
