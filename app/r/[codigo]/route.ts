import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_REFERIDO, normalizarCodigo, VENTANA_REFERIDO_DIAS } from "@/lib/imt/pagos";

export const dynamic = "force-dynamic";

/**
 * Enlace corto de referido: /r/<CODIGO>. Guarda el código 30 días y lleva a los planes.
 * Un código con forma inválida no guarda nada. Que el código exista se valida al pagar.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await ctx.params;
  const limpio = normalizarCodigo(codigo);
  const destino = new URL("/planes", req.url);
  const respuesta = NextResponse.redirect(destino);
  if (limpio) {
    respuesta.cookies.set(COOKIE_REFERIDO, limpio, {
      maxAge: VENTANA_REFERIDO_DIAS * 24 * 3600,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return respuesta;
}
