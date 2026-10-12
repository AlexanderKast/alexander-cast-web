import { NextResponse } from "next/server";
import { obtenerPedido } from "@/lib/comunidad/pedidos";
import { pedidoIdValido } from "@/lib/comunidad/pagos";

export const dynamic = "force-dynamic";

/** Estado del pedido para la pantalla de «gracias». Solo expone el estado, nada personal. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = pedidoIdValido((await ctx.params).id);
  const sinCache = { "Cache-Control": "no-store" };
  if (!id) return NextResponse.json({ estado: "desconocido" }, { status: 404, headers: sinCache });
  const pedido = await obtenerPedido(id);
  if (!pedido) return NextResponse.json({ estado: "desconocido" }, { status: 404, headers: sinCache });
  return NextResponse.json(
    { estado: pedido.estado, listo: pedido.estado === "pagado" && pedido.aprovisionadoEn !== null },
    { headers: sinCache },
  );
}
