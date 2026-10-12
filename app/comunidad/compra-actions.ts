"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, emailLimiter, formLimiter } from "@/lib/rate-limit";
import { isSameOriginStrict } from "@/lib/same-origin";
import { compraSchema } from "@/lib/comunidad/validators";
import { ConfigPagoError, crearCheckout, crearPedido, tienePagoConfirmado } from "@/lib/comunidad/pedidos";
import type { EstadoForm } from "./actions";

/**
 * Captación + pago: cada envío del formulario guarda un pedido «pendiente»
 * (el lead queda registrado aunque no pague) y lleva al comprador a Stripe.
 */
export async function iniciarCompra(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (fd.get("website")) return { status: "error", message: "Solicitud no válida." }; // honeypot

  const hdrs = await headers();
  if (!isSameOriginStrict(hdrs)) return { status: "error", message: "Solicitud no válida." };

  const parsed = compraSchema.safeParse({
    nombre: fd.get("nombre"),
    email: fd.get("email"),
    whatsapp: fd.get("whatsapp"),
    acepto: fd.get("acepto") ?? "no",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "form");
      if (!fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { status: "error", message: "Revisa los datos.", fieldErrors };
  }
  const d = parsed.data;

  const ip = clientIp(hdrs);
  const porIp = await formLimiter(`mia:buy:ip:${ip}`);
  const porCorreo = await emailLimiter(`mia:buy:em:${d.email}`);
  if (!porIp.success || !porCorreo.success) {
    return { status: "error", message: "Muchos intentos seguidos. Prueba en unos minutos." };
  }

  // Evita cobrar dos veces a la misma persona.
  if (await tienePagoConfirmado(d.email)) {
    return {
      status: "error",
      message: "Ya tenemos un pago con ese correo. Revisa tu bandeja (y spam) o entra desde «Ya tengo cuenta».",
    };
  }

  let url: string;
  try {
    const pedido = await crearPedido({
      nombre: d.nombre,
      email: d.email,
      whatsapp: d.whatsapp,
      origen: fd.get("o") === "stand" ? "stand" : "web",
      ip,
    });
    url = await crearCheckout(pedido);
  } catch (e) {
    console.error("[comunidad] no se pudo iniciar la compra:", e);
    return {
      status: "error",
      message:
        e instanceof ConfigPagoError
          ? "El pago no está disponible en este momento. Escríbenos por WhatsApp y te ayudamos."
          : "No pudimos iniciar el pago. Intenta de nuevo en unos segundos.",
    };
  }
  redirect(url);
}
