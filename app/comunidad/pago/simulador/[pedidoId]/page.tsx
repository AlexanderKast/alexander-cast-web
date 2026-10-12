import { notFound } from "next/navigation";
import { obtenerPedido } from "@/lib/comunidad/pedidos";
import { pedidoIdValido } from "@/lib/comunidad/pagos";
import { simuladorActivo } from "@/lib/comunidad/stripe";
import { formatoPrecio } from "@/lib/comunidad/precio";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";
import { simularPago } from "../actions";

export default async function SimuladorPage({ params }: { params: Promise<{ pedidoId: string }> }) {
  if (!simuladorActivo()) notFound();
  const id = pedidoIdValido((await params).pedidoId);
  const pedido = id ? await obtenerPedido(id) : null;
  if (!id || !pedido) notFound();

  const casos: [string, string, string][] = [
    ["pagado", "Pago exitoso", botonCls],
    ["monto_distinto", "Pago con monto distinto (debe ir a revisión)", botonSecundarioCls],
    ["fallido", "Pago fallido", botonSecundarioCls],
    ["abandonado", "Checkout abandonado", botonSecundarioCls],
  ];

  return (
    <div className="mx-auto max-w-md py-8">
      <p className="mia-eyebrow">Simulador · solo desarrollo</p>
      <h1 className="mia-title mt-3">Simular el pago</h1>
      <p className="mia-lead mt-3">
        Sustituye a Stripe mientras no haya <code>STRIPE_SECRET_KEY</code>. Recorre el mismo camino que el
        webhook real.
      </p>
      <div className="mia-card-soft mt-6 text-sm">
        <p className="font-medium">{pedido.nombre}</p>
        <p className="mia-muted">{pedido.email}</p>
        <p className="mt-2">
          {formatoPrecio(pedido.montoCentavos)} · estado: <strong>{pedido.estado}</strong>
        </p>
      </div>
      <div className="mt-6 space-y-3">
        {casos.map(([caso, texto, cls]) => (
          <form key={caso} action={simularPago}>
            <input type="hidden" name="pedido" value={id} />
            <input type="hidden" name="caso" value={caso} />
            <button type="submit" className={cls + " mia-btn-block"}>
              {texto}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
