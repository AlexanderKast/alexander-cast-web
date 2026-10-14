import Link from "next/link";
import { notFound } from "next/navigation";
import { requireComercial } from "@/lib/comunidad/auth";
import { uuidValido } from "@/lib/comunidad/acceso";
import { listarAsignables, obtenerOportunidad } from "@/lib/comunidad/oportunidades";
import { ofertasActivas } from "@/lib/comunidad/catalogo";
import {
  ABIERTAS,
  ETIQUETA_ESTADO,
  TRANSICIONES_MANUALES,
  puedeAsignar,
  puedeCrearPedido,
  puedeGestionar,
} from "@/lib/comunidad/oportunidades-reglas";
import { formatoMoneda } from "@/lib/comunidad/precio";
import { enlaceWhatsapp } from "@/lib/comunidad/whatsapp";
import { baseUrl } from "@/lib/comunidad/url";
import { Asignar, CambiarEstado, FijarOferta, GenerarPedido, NuevaNota } from "@/components/comunidad/ComercialAcciones";

export const dynamic = "force-dynamic";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });

export default async function OportunidadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidValido(id)) notFound();

  const m = await requireComercial();
  const actor = { userId: m.userId, rol: m.rol };
  // obtenerOportunidad aplica puedeVer: un comercial no abre oportunidades ajenas.
  const dato = await obtenerOportunidad(actor, id);
  if (!dato) notFound();
  const { oportunidad: o, notas } = dato;

  const lite = { userId: o.userId, asignadoA: o.asignadoA, estado: o.estado };
  const gestiona = puedeGestionar(actor, lite);
  const abierta = ABIERTAS.includes(o.estado);

  const [ofertas, asignables] = await Promise.all([
    gestiona && abierta ? ofertasActivas(o.productoId) : Promise.resolve([]),
    puedeAsignar(actor) && abierta ? listarAsignables() : Promise.resolve([]),
  ]);

  const destinos = (TRANSICIONES_MANUALES[o.estado] ?? [])
    .filter((d) => d !== "asignada" || puedeAsignar(actor))
    .map((d) => ({ valor: d, etiqueta: ETIQUETA_ESTADO[d] }));

  const puedePedido = puedeCrearPedido(actor, { ...lite, ofertaId: o.ofertaId }).ok;
  const wa = o.clienteWhatsapp && o.canal === "whatsapp"
    ? enlaceWhatsapp(
        o.clienteWhatsapp,
        `Hola ${o.clienteNombre.split(" ")[0]}, te escribo del equipo de la plataforma por tu interés en ${o.productoNombre}. ¿Cuándo te queda bien que hablemos?`,
      )
    : null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/comunidad/comercial" className="mia-back">
          ← Oportunidades
        </Link>
        <p className="mia-eyebrow mt-5">{o.productoNombre}</p>
        <h1 className="mia-title mt-3">{o.clienteNombre}</h1>
        <p className="mia-muted mt-2 text-sm">
          {o.clienteEmail}
          {o.clienteWhatsapp ? ` · ${o.clienteWhatsapp}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={"mia-chip " + (o.estado === "ganada" ? "mia-chip-ok" : "")}>{ETIQUETA_ESTADO[o.estado]}</span>
          <span className="mia-chip">{o.ofertaNombre ?? "Sin oferta elegida"}</span>
          <span className="mia-chip">Canal: {o.canal === "whatsapp" ? "WhatsApp" : "Correo"}</span>
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="mia-btn mia-btn-secondary mia-btn-sm">
              Escribir por WhatsApp
            </a>
          ) : null}
        </div>
        <p className="mia-muted mt-3 text-xs">
          Autorizó ser contactada el {fecha(o.contactoAutorizadoEn)} · Asignada a: {o.asignadoNombre ?? "nadie todavía"}
        </p>
      </div>

      {o.pedidoId ? (
        <div className="mia-card-soft">
          <p className="text-sm font-medium">Pedido vinculado</p>
          <p className="mia-muted mt-1 break-all font-mono text-xs">{`${baseUrl()}/comunidad/pedidos/${o.pedidoId}`}</p>
          <p className="mia-muted mt-2 text-xs">
            La cuenta del cliente debe iniciar sesión para pagarlo. Tú no marcas el pago: se confirma solo con Stripe.
          </p>
        </div>
      ) : null}

      {gestiona && abierta ? (
        <section className="grid gap-6 md:grid-cols-2" aria-label="Gestión">
          {ofertas.length ? (
            <div className="mia-card space-y-5">
              <FijarOferta
                id={o.id}
                actual={o.ofertaId}
                ofertas={ofertas.map((x) => ({ id: x.id, etiqueta: `${x.nombre} · ${formatoMoneda(x.precioCentavos, x.moneda)}` }))}
              />
              <GenerarPedido id={o.id} habilitado={puedePedido} />
            </div>
          ) : null}
          <div className="mia-card space-y-5">
            <CambiarEstado id={o.id} destinos={destinos} />
            {asignables.length ? (
              <Asignar id={o.id} actual={o.asignadoA} opciones={asignables.map((a) => ({ userId: a.userId, nombre: a.nombre }))} />
            ) : null}
          </div>
        </section>
      ) : null}

      {gestiona ? (
        <section className="mia-card space-y-5" aria-labelledby="notas">
          <h2 id="notas" className="text-lg font-semibold">
            Notas internas
          </h2>
          <NuevaNota id={o.id} />
          <ul className="space-y-3">
            {notas.map((n) => (
              <li key={n.id} className="mia-card-soft !p-4">
                <p className="whitespace-pre-wrap text-sm">{n.texto}</p>
                <p className="mia-muted mt-2 text-xs">
                  {n.autorNombre ?? "—"} · {fecha(n.createdAt)}
                </p>
              </li>
            ))}
            {notas.length === 0 ? <li className="mia-muted text-sm">Sin notas todavía.</li> : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
