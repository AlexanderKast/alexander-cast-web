import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { derechoDe, requireMiembro } from "@/lib/comunidad/auth";
import { cuposLibres, obtenerProductoPublicado, ofertasActivas } from "@/lib/comunidad/catalogo";
import { accionParaOferta, MENSAJE_NO_DISPONIBLE, type AccionOferta, type OfertaVista } from "@/lib/comunidad/ofertas";
import { pedidosAbiertosDe } from "@/lib/comunidad/pedidos";
import { oportunidadesDeCuenta } from "@/lib/comunidad/oportunidades";
import { slugValido } from "@/lib/comunidad/acceso";
import {
  AVISO_CLAUDE,
  ETIQUETA_DERECHO,
  INCLUYE_TODOS,
  LO_QUE_TE_LLEVAS,
  PRODUCTO_PRINCIPAL,
  RESULTADOS,
} from "@/lib/comunidad/oferta";
import { fechaCorta, formatoMoneda } from "@/lib/comunidad/precio";
import { BotonComprar } from "@/components/comunidad/AccionOferta";
import { FormAsesor } from "@/components/comunidad/FormAsesor";
import { botonSecundarioCls } from "@/components/comunidad/ui";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const ESTADOS_ASESOR: Record<string, string> = {
  nueva: "recibida",
  asignada: "asignada a un asesor",
  contactada: "en contacto",
  propuesta: "con una propuesta",
  pendiente_pago: "con un pedido listo para pagar",
};

/**
 * Detalle de un programa, DENTRO de la cuenta. Muestra beneficios, ofertas vigentes y las acciones que le
 * corresponden a ESTA cuenta (comprar, continuar, ya adquirido). Comprar aquí exige sesión y crea un pedido propio.
 */
export default async function ProgramaDetalle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugValido(slug)) notFound();
  const m = await requireMiembro();

  const producto = await obtenerProductoPublicado(slug).catch(() => null);
  if (!producto) notFound();

  const derecho = derechoDe(m, slug);
  let ofertas: OfertaVista[] = [];
  let errorOfertas = false;
  try {
    ofertas = await ofertasActivas(producto.id);
  } catch {
    errorOfertas = true;
  }

  const [abiertos, solicitudes] = await Promise.all([pedidosAbiertosDe(m.userId), oportunidadesDeCuenta(m.userId)]);
  const solicitud = solicitudes.find((s) => s.productoId === producto.id && s.estado in ESTADOS_ASESOR);
  const ahora = new Date();

  // Un solo cálculo de acción por oferta; los cupos se consultan por oferta (null = no se pudo consultar).
  const acciones = await Promise.all(
    ofertas.map(async (o) => ({
      oferta: o,
      accion: accionParaOferta(o, producto.requiereProductoId, {
        ahora,
        derechos: m.derechos.map((d) => ({ productoId: d.productoId, cohorteId: d.cohorte?.id ?? null })),
        pedidosAbiertos: abiertos,
        cuposLibres: await cuposLibres(o.id),
      }) as AccionOferta,
    })),
  );
  const vendibles = acciones.filter((a) => a.accion.tipo !== "no_disponible" || a.accion.motivo === "agotada" || a.accion.motivo === "requisito");
  const esMaster = slug === PRODUCTO_PRINCIPAL;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/comunidad/programas" className="mia-back">
          ← Programas
        </Link>
        <p className="mia-eyebrow mt-5">{producto.tipo === "upsell" ? "Complemento" : "Programa"}</p>
        <h1 className="mia-title mt-3">{producto.nombre}</h1>
        {producto.resumen ? <p className="mia-lead mt-3">{producto.resumen}</p> : null}
      </div>

      {/* Acceso adquirido */}
      {derecho ? (
        <section className="mia-card-dark" aria-labelledby="tu-acceso">
          <p className="mia-eyebrow">Ya lo tienes</p>
          <h2 id="tu-acceso" className="mt-2 text-xl font-bold">
            Tu acceso a {producto.nombre}
          </h2>
          <p className="mia-muted mt-1 text-sm">
            Entrada: {derecho.entrada}
            {derecho.cohorte ? ` · ${derecho.cohorte.nombre}` : ""}
          </p>
          {esMaster ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/comunidad/ficha" className="mia-btn mia-btn-primary mia-btn-sm">
                Ficha de tu negocio
              </Link>
              {derecho.derechos.includes("sesion_arranque") ? (
                <Link href="/comunidad/bono" className="mia-btn mia-btn-secondary mia-btn-sm">
                  Sesión grupal de arranque
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Contenido del programa */}
      {esMaster ? (
        <section aria-labelledby="que-incluye" className="space-y-6">
          <div>
            <p id="que-incluye" className="mia-eyebrow">
              Qué construyes
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {RESULTADOS.map(([t, d]) => (
                <article key={t} className="mia-card-soft !p-5">
                  <h3 className="text-lg font-semibold">{t}</h3>
                  <p className="mia-muted mt-1 text-sm leading-relaxed">{d}</p>
                </article>
              ))}
            </div>
          </div>
          <div>
            <p className="mia-eyebrow">Lo que te llevas</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {LO_QUE_TE_LLEVAS.map((x) => (
                <li key={x} className="mia-card flex gap-3 !p-4 text-sm">
                  <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mia-eyebrow">Incluye en todas las entradas</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {INCLUYE_TODOS.map((x) => (
                <li key={x} className="mia-card-soft flex gap-3 !p-4 text-sm">
                  <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <p role="note" className="mia-alert mt-4">
              <strong>Importante:</strong> {AVISO_CLAUDE}
            </p>
          </div>
        </section>
      ) : null}

      {/* Ofertas y compra */}
      {!derecho ? (
        <section aria-labelledby="entradas" className="space-y-4">
          <p id="entradas" className="mia-eyebrow">
            Entradas
          </p>
          {errorOfertas ? (
            <p role="alert" className="mia-alert mia-alert-error">
              No pudimos cargar las entradas ahora. Intenta de nuevo en unos minutos.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {vendibles.map(({ oferta: o, accion }) => (
              <article key={o.id} id={`oferta-${o.slug}`} className="mia-card flex scroll-mt-24 flex-col">
                <h2 className="text-lg font-semibold">{o.nombre}</h2>
                <p className="mt-2 font-[family-name:var(--mia-font-display)] text-3xl font-bold tracking-tight">
                  {formatoMoneda(o.precioCentavos, o.moneda)}{" "}
                  <span className="mia-muted text-sm font-normal">{o.moneda.toUpperCase()}</span>
                </p>
                {o.nota ? <p className="mia-muted mt-1 text-sm">{o.nota}</p> : null}
                {o.disponibleHasta ? (
                  <p className="mia-muted mt-1 text-xs">Disponible hasta el {fechaCorta(o.disponibleHasta)}.</p>
                ) : null}
                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {(o.extras.length ? o.extras : o.derechos.map((d) => ETIQUETA_DERECHO[d] ?? d)).map((x) => (
                    <li key={x} className="flex gap-2">
                      <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
                      {x}
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {accion.tipo === "comprar" ? (
                    <>
                      <BotonComprar ofertaId={o.id} etiqueta={`Comprar ${o.nombre.split(" ·")[0]}`} />
                      {accion.cuposSinVerificar ? (
                        <p className="mia-muted mt-2 text-xs">No pudimos consultar los cupos; se confirman al pagar.</p>
                      ) : null}
                    </>
                  ) : accion.tipo === "continuar" ? (
                    <BotonComprar ofertaId={o.id} etiqueta="Continuar compra" />
                  ) : accion.tipo === "no_disponible" ? (
                    <p className="mia-alert text-sm">{MENSAJE_NO_DISPONIBLE[accion.motivo]}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          {!errorOfertas && vendibles.length === 0 ? (
            <p className="mia-alert">Por ahora no hay entradas disponibles para este programa.</p>
          ) : null}
        </section>
      ) : null}

      {/* Asesor */}
      {!derecho ? (
        <section id="asesor" aria-labelledby="asesor-titulo" className="mia-card-soft max-w-xl scroll-mt-24">
          <h2 id="asesor-titulo" className="text-lg font-semibold">
            ¿Prefieres hablar con un asesor?
          </h2>
          {solicitud ? (
            <p role="status" className="mia-alert mia-alert-ok mt-3 text-sm">
              Tu solicitud está {ESTADOS_ASESOR[solicitud.estado]}. Si hay un pedido listo, lo verás en «Mi cuenta».
            </p>
          ) : (
            <>
              <p className="mia-muted mb-4 mt-2 text-sm">
                Te contactamos con los datos de tu cuenta. Pedirlo no es una compra ni reserva un cupo.
              </p>
              <FormAsesor programa={producto.slug} tieneWhatsapp={Boolean(m.whatsapp)} />
            </>
          )}
        </section>
      ) : null}

      <p className="mia-muted text-sm">
        <Link href="/comunidad/mis-programas" className={botonSecundarioCls}>
          Ir a Mis programas
        </Link>
      </p>
    </div>
  );
}
