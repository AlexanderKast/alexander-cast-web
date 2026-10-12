/** Versión del texto de privacidad aceptado (para poder demostrar qué se aceptó y cuándo). */
export const PRIVACIDAD_VERSION = "2026-10";

/** UTM saneada: texto corto, sin caracteres raros y sin datos personales. null si queda vacía. */
export function sanearUtm(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  // Algo con forma de correo o teléfono largo no es una campaña: se descarta.
  if (/@/.test(valor) || /\d{8,}/.test(valor)) return null;
  const limpio = valor
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} ._+\-:/]/gu, "")
    .trim()
    .slice(0, 100);
  return limpio || null;
}

export const UTM_CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
