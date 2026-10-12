import type { Metadata } from "next";
import Link from "next/link";
import { requireMiembro } from "@/lib/comunidad/auth";
import { listarPedidosDe } from "@/lib/comunidad/pedidos";
import { oportunidadesDeCuenta } from "@/lib/comunidad/oportunidades";
import { formatoMoneda } from "@/lib/comunidad/precio";
import { botonSecundarioCls } from "@/components/comunidad/ui";

export const metadata: Metadata = {
  title: "Mi cuenta · Plataforma",
  robots: { index: false, follow: false },
};

const ESTADO_PEDIDO: Record<string, string> = {
  pendiente: "Pendiente de pago",
  pagado: "Pagado",
  fallido: "El pago falló",
  abandonado: "No se completó",
  reembolsado: "Reembolsado",
  disputa: "En disputa",
  revision: "En revisión",
};
const ESTADO_ASESOR: Record<string, string> = {
  nueva: "Recibida",
  asignada: "Asignada a un asesor",
  contactada: "En contacto",
  propuesta: "Con propuesta",
  pendiente_pago: "Pedido listo para pagar",
  ganada: "Completada",
  perdida: "Cerrada",
};

/** Datos de la cuenta, pedidos propios y solicitudes de asesor. No depende de haber comprado. */
export default async function MiCuentaPage() {
  const m = await requireMiembro();
  const [pedidos, solicitudes] = await Promise.all([listarPedidosDe(m.userId), oportunidadesDeCuenta(m.userId)]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="mia-eyebrow">Mi cuenta</p>
        <h1 className="mia-title mt-3">Hola, {m.nombre.split(" ")[0]}</h1>
      </div>

      <section className="mia-card-soft text-sm">
        <p className="mia-label">Tus datos</p>
        <p className="font-medium">{m.nombre}</p>
        <p className="mia-muted">{m.email}</p>
        {m.whatsapp ? <p className="mia-muted">{m.whatsapp}</p> : null}
      </section>

      <section aria-labelledby="pedidos">
        <h2 id="pedidos" className="text-lg font-semibold">
          Mis pedidos
        </h2>
        {pedidos.length === 0 ? (
          <p className="mia-muted mt-2 text-sm">Todavía no tienes pedidos.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pedidos.map((p) => (
              <li key={p.id} className="mia-card flex flex-wrap items-center justify-between gap-3 !p-4">
                <div>
                  <p className="font-medium">
                    {p.snapshot?.producto?.nombre ?? "Programa"} · {p.snapshot?.oferta?.nombre ?? p.nivel}
                  </p>
                  <p className="mia-muted text-sm">
                    {formatoMoneda(p.montoCentavos, p.moneda)} · {ESTADO_PEDIDO[p.estado] ?? p.estado}
                  </p>
                </div>
                <Link href={`/comunidad/pedidos/${p.id}`} className={botonSecundarioCls}>
                  {p.estado === "pendiente" ? "Continuar" : "Ver"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="solicitudes">
        <h2 id="solicitudes" className="text-lg font-semibold">
          Solicitudes de asesoría
        </h2>
        {solicitudes.length === 0 ? (
          <p className="mia-muted mt-2 text-sm">No has pedido que un asesor te contacte.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {solicitudes.map((s) => (
              <li key={s.id} className="mia-card !p-4">
                <p className="font-medium">{s.productoNombre}</p>
                <p className="mia-muted text-sm">
                  {ESTADO_ASESOR[s.estado] ?? s.estado} · por {s.canal === "whatsapp" ? "WhatsApp" : "correo"}
                </p>
                {s.pedidoId && s.estado === "pendiente_pago" ? (
                  <Link href={`/comunidad/pedidos/${s.pedidoId}`} className="mia-link mt-2 inline-block text-sm">
                    Ver y pagar mi pedido
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
