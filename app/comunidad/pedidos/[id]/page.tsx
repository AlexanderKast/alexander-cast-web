import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMiembro } from "@/lib/comunidad/auth";
import { uuidValido } from "@/lib/comunidad/acceso";
import { obtenerPedidoPropio } from "@/lib/comunidad/pedidos";
import { formatoMoneda } from "@/lib/comunidad/precio";
import { BotonPagarPedido } from "@/components/comunidad/AccionOferta";
import { botonCls } from "@/components/comunidad/ui";

export const metadata: Metadata = {
  title: "Mi pedido · Plataforma",
  robots: { index: false, follow: false },
};

const ESTADO: Record<string, string> = {
  pendiente: "Pendiente de pago",
  pagado: "Pagado",
  fallido: "El pago falló",
  abandonado: "No se completó",
  reembolsado: "Reembolsado",
  disputa: "En disputa",
  revision: "En revisión",
};

/**
 * Un pedido de LA CUENTA con sesión. Es el destino de «continuar compra», de la cancelación en Stripe y del enlace
 * que genera un asesor. Un id de pedido ajeno (o inexistente) responde igual que uno que no existe: 404.
 */
export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancelado?: string }>;
}) {
  const { id } = await params;
  if (!uuidValido(id)) notFound();
  const m = await requireMiembro(); // sin sesión → login (y de vuelta aquí mediante next)

  const pedido = await obtenerPedidoPropio(id, m.userId);
  if (!pedido) notFound();
  const { cancelado } = await searchParams;

  const producto = pedido.snapshot?.producto?.nombre ?? "Programa";
  const oferta = pedido.snapshot?.oferta?.nombre ?? pedido.nivel;
  const slug = pedido.snapshot?.producto?.slug;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/comunidad/mi-cuenta" className="mia-back">
          ← Mi cuenta
        </Link>
        <p className="mia-eyebrow mt-5">Pedido</p>
        <h1 className="mia-title mt-3">{producto}</h1>
      </div>

      {cancelado && pedido.estado === "pendiente" ? (
        <p role="status" className="mia-alert">
          No se completó el pago. Puedes retomarlo cuando quieras, mientras haya cupos y la oferta siga vigente.
        </p>
      ) : null}

      <section className="mia-card">
        <p className="mia-label">Entrada</p>
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{oferta}</span>
          <span className="font-[family-name:var(--mia-font-display)] text-2xl font-bold">
            {formatoMoneda(pedido.montoCentavos, pedido.moneda)}
          </span>
        </p>
        <p className="mia-muted mt-1 text-sm">{pedido.moneda.toUpperCase()}</p>
        <p className="mt-4">
          <span className={"mia-chip " + (pedido.estado === "pagado" ? "mia-chip-ok" : "")}>{ESTADO[pedido.estado] ?? pedido.estado}</span>
        </p>

        <div className="mt-6">
          {pedido.estado === "pendiente" || pedido.estado === "abandonado" || pedido.estado === "fallido" ? (
            <>
              <BotonPagarPedido pedidoId={pedido.id} etiqueta="Pagar ahora" />
              <p className="mia-muted mt-3 text-center text-xs">
                Pagas en el checkout seguro de Stripe. El precio final lo confirma el servidor.
              </p>
            </>
          ) : null}
          {pedido.estado === "pagado" ? (
            <Link href={slug ? `/comunidad/programas/${slug}` : "/comunidad/mis-programas"} className={botonCls + " mia-btn-block"}>
              Ir al programa
            </Link>
          ) : null}
          {pedido.estado === "revision" || pedido.estado === "disputa" || pedido.estado === "reembolsado" ? (
            <p className="mia-alert text-sm">Estamos revisando este pedido. Te escribiremos cuando esté resuelto.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
