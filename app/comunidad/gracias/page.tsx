import { redirect } from "next/navigation";
import { requireMiembro } from "@/lib/comunidad/auth";
import { uuidValido } from "@/lib/comunidad/acceso";
import { obtenerPedidoPropio } from "@/lib/comunidad/pedidos";
import { EstadoPago } from "@/components/comunidad/EstadoPago";

/**
 * Retorno de Stripe. Solo para el DUEÑO del pedido y SIN efectos: abrir esta página nunca activa un programa ni
 * cuenta como compra; solo muestra el estado que fijó el webhook verificado.
 */
export default async function GraciasPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const m = await requireMiembro();
  const id = (await searchParams).p;
  if (!uuidValido(id)) redirect("/comunidad/mis-programas");
  const pedido = await obtenerPedidoPropio(id, m.userId);
  if (!pedido) redirect("/comunidad/mis-programas"); // un pedido ajeno no se revela

  return (
    <div className="mx-auto max-w-lg py-8 sm:py-16">
      <p className="mia-eyebrow mb-4">{pedido.snapshot?.producto?.nombre ?? "Tu pedido"}</p>
      <EstadoPago pedidoId={pedido.id} />
    </div>
  );
}
