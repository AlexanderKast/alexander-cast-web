import type { Metadata } from "next";
import Link from "next/link";
import { FormCompra, type OpcionNivel } from "@/components/comunidad/FormCompra";
import { Countdown } from "@/components/comunidad/Countdown";
import {
  AVISO_CLAUDE,
  CUPOS_TOTAL,
  FIN_PREVENTA,
  INCLUYE_TODOS,
  NIVELES,
  SESION_ARRANQUE,
  fechaLimiteLegible,
  montoCentavos,
  nivelesDisponibles,
  preventaVigente,
} from "@/lib/comunidad/oferta";
import { cuposRestantes } from "@/lib/comunidad/pedidos";
import { NOMBRE_PRODUCTO, formatoPesos } from "@/lib/comunidad/precio";

/** Página de venta: sí se puede indexar y compartir. */
export const metadata: Metadata = {
  title: `${NOMBRE_PRODUCTO} · Inscripciones abiertas`,
  description:
    "Aprende a usar IA en tu negocio, en vivo y acompañado: 8 clases, entregables y 60 días de comunidad activa.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

const PREGUNTAS = [
  ["¿Cuándo empiezan las clases?", "El jueves 22 de octubre. Son 8 clases de 2,5 horas, 2 por semana, 100% virtuales."],
  ["¿Cómo entro a la plataforma?", "Al pagar recibes un correo con un botón de acceso. Sin contraseñas. Ahí subes la ficha de tu negocio."],
  ["¿Qué pasa si no termino hoy el pago?", "Tu lugar no se pierde: te escribimos por WhatsApp para ayudarte a completarlo."],
  ["¿Qué necesito aparte?", AVISO_CLAUDE],
] as const;

export default async function UnetePage({
  searchParams,
}: {
  searchParams: Promise<{ cancelado?: string; o?: string; n?: string }>;
}) {
  const { cancelado, o, n } = await searchParams;
  const disponibles = nivelesDisponibles();
  const cupos = await cuposRestantes().catch(() => null);
  const agotado = cupos !== null && cupos.total <= 0;

  const opciones: OpcionNivel[] = disponibles
    .filter((id) => !(id === "vip" && cupos !== null && cupos.vip <= 0))
    .map((id) => ({
      id,
      nombre: NIVELES[id].nombre,
      precio: formatoPesos(montoCentavos(id)),
      nota: NIVELES[id].nota,
      extras: NIVELES[id].extras,
    }));
  const inicial = opciones.find((x) => x.id === n)?.id ?? opciones[0]?.id;
  const abierto = opciones.length > 0 && !agotado && inicial !== undefined;

  return (
    <div className="space-y-12 sm:space-y-16">
      <header className="relative isolate">
        <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72" />
        <p className="mia-eyebrow">Inscripciones abiertas · Cohorte 1</p>
        <h1 className="mia-title mt-4 max-w-3xl">Aprende a usar IA en tu negocio, en vivo y acompañado</h1>
        <p className="mia-lead mt-5">
          {NOMBRE_PRODUCTO} es un programa de 4 semanas para emprendedores que quieren pasar de «probar
          herramientas» a tener sistemas funcionando: una web, una app y una herramienta, construidas contigo.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="mia-chip mia-chip-ok">Empieza el 22 de octubre</span>
          <span className="mia-chip">{CUPOS_TOTAL} cupos</span>
          <span className="mia-chip">8 clases en vivo</span>
        </div>
      </header>

      {cancelado ? (
        <p role="status" className="mia-alert">
          No se completó el pago. Tus datos están guardados: puedes intentarlo de nuevo cuando quieras.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-8">
          {preventaVigente() ? (
            <section className="mia-card-dark">
              <p className="mia-eyebrow">Precio de feria · hasta el domingo {fechaLimiteLegible()}</p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                {formatoPesos(montoCentavos("preventa"))} y entras con la {SESION_ARRANQUE.titulo.toLowerCase()}
              </h2>
              <p className="mia-lead mt-3">{SESION_ARRANQUE.resumen}</p>
              <p className="mia-label mt-7 !text-[var(--mia-dark-muted)]">El precio de feria cierra en</p>
              <Countdown hasta={FIN_PREVENTA.toISOString()} />
              <p className="mt-4 text-xs text-[var(--mia-dark-muted)]">
                Después del {fechaLimiteLegible()} el programa cuesta {formatoPesos(montoCentavos("regular"))} y la
                sesión de arranque queda solo para el VIP.
              </p>
            </section>
          ) : null}

          <section>
            <p className="mia-eyebrow">Qué incluye todo</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {INCLUYE_TODOS.map((x) => (
                <li key={x} className="mia-card-soft flex gap-3 !p-5 text-sm leading-relaxed">
                  <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <p className="mia-muted mt-4 text-sm">{AVISO_CLAUDE}</p>
          </section>

          <section>
            <p className="mia-eyebrow">Preguntas frecuentes</p>
            <div className="mt-4 divide-y divide-[var(--mia-border)] rounded-2xl border border-[var(--mia-border)] bg-[var(--mia-elev)]">
              {PREGUNTAS.map(([q, a]) => (
                <details key={q} className="group p-5">
                  <summary className="cursor-pointer list-none text-sm font-semibold">{q}</summary>
                  <p className="mia-muted mt-2 text-sm leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside id="inscripcion" className="lg:sticky lg:top-24">
          <div className="mia-card">
            <p className="mia-eyebrow">Reserva tu lugar</p>
            {abierto ? (
              <div className="mt-5">
                <FormCompra niveles={opciones} nivelInicial={inicial} origen={o === "stand" ? "stand" : "web"} />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <h2 className="text-xl font-bold">
                  {agotado ? "Los cupos de esta cohorte se agotaron" : "Las inscripciones de esta cohorte cerraron"}
                </h2>
                <p className="mia-muted text-sm leading-relaxed">
                  Escríbenos por WhatsApp y te dejamos en la lista de espera de la cohorte 2.
                </p>
              </div>
            )}
          </div>
          <p className="mia-muted mt-4 text-center text-sm">
            ¿Ya tienes cuenta?{" "}
            <Link href="/comunidad/login" className="mia-link">
              Entra aquí
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
