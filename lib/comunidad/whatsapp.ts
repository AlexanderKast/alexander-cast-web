/**
 * Enlace de WhatsApp con mensaje prellenado (recuperación de compras a medias).
 * Sin indicativo, un celular colombiano de 10 dígitos que empieza por 3 recibe el 57.
 */
export function enlaceWhatsapp(telefono: string | null | undefined, mensaje: string): string | null {
  if (!telefono) return null;
  let digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10 && digitos.startsWith("3")) digitos = `57${digitos}`;
  if (digitos.length < 8 || digitos.length > 15) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}
