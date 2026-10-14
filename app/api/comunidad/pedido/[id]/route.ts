import { NextResponse } from "next/server";
import { getMiembro } from "@/lib/comunidad/auth";
import { obtenerPedidoPropio } from "@/lib/comunidad/pedidos";
import { uuidValido } from "@/lib/comunidad/acceso";

export const dynamic = "force-dynamic";

/**
 * Estado del pedido para la pantalla de «gracias». Exige sesión y que el pedido sea de ESA cuenta: un UUID no es
 * prueba de propiedad. Para cualquier otro caso responde igual que si no existiera.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sinCache = { "Cache-Control": "no-store" };
  const noExiste = () => NextResponse.json({ estado: "desconocido" }, { status: 404, headers: sinCache });

  const { id } = await ctx.params;
  if (!uuidValido(id)) return noExiste();
  const m = await getMiembro();
  if (!m) return noExiste();
  const pedido = await obtenerPedidoPropio(id, m.userId);
  if (!pedido) return noExiste();

  return NextResponse.json(
    { estado: pedido.estado, listo: pedido.estado === "pagado" && pedido.aprovisionadoEn !== null },
    { headers: sinCache },
  );
}
