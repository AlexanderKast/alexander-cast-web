import type { Metadata } from "next";
import Link from "next/link";
import { FormCompra } from "@/components/comunidad/FormCompra";
import { Countdown } from "@/components/comunidad/Countdown";
import { CLASE_PRIVADA, FECHA_LIMITE_BONO, bonoVigente, fechaLimiteLegible } from "@/lib/comunidad/oferta";
import { NOMBRE_PRODUCTO, formatoPrecio } from "@/lib/comunidad/precio";

/** Esta es la página de venta: sí se puede indexar y compartir. */
export const metadata: Metadata = {
  title: `${NOMBRE_PRODUCTO} · Inscripciones abiertas`,
  description:
    "Aprende a usar IA en tu negocio, en vivo y acompañado: 8 clases, entregables y 60 días de comunidad activa.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

const PUNTOS = [
  ["8 clases en vivo", "2 por semana durante 4 semanas, con grabación para repasar."],
  ["Entregables reales", "Sales con tareas hechas y materiales listos para aplicar en tu negocio."],
  ["Comunidad activa", "Preguntas, avances y recursos con otros emprendedores de tu cohorte."],
  ["60 días de acompañamiento", "Después del programa, un live semanal para resolver tus dudas."],
] as const;

const PREGUNTAS = [
  ["¿Cuándo empiezan las clases?", "El jueves 22 de octubre. Son 8 clases, 2 por semana."],
  ["¿Cómo entro a la plataforma?", "Al pagar recibes un correo con un botón de acceso. Sin contraseñas."],
  ["¿Qué pasa si no termino hoy el pago?", "Tu lugar no se pierde: te escribimos por WhatsApp para ayudarte a completarlo."],
] as const;

export default async function UnetePage({
  searchParams,
}: {
  searchParams: Promise<{ cancelado?: string; o?: string }>;
}) {
  const { cancelado, o } = await searchParams;
  const conBono = bonoVigente();
  const precio = formatoPrecio();

  return (
    <div className="space-y-12 sm:space-y-16">
      <header className="relative isolate">
        <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72" />
        <p className="mia-eyebrow">Inscripciones abiertas · Cohorte 1</p>
        <h1 className="mia-title mt-4 max-w-3xl">Aprende a usar IA en tu negocio, en vivo y acompañado</h1>
        <p className="mia-lead mt-5">
          {NOMBRE_PRODUCTO} es un programa de 4 semanas para emprendedores que quieren pasar de «probar
          herramientas» a tener sistemas funcionando.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="mia-chip mia-chip-ok">Pago único {precio}</span>
          <span className="mia-chip">Empieza el 22 de octubre</span>
        </div>
      </header>

      {cancelado ? (
        <p role="status" className="mia-alert">
          No se completó el pago. Tus datos están guardados: puedes intentarlo de nuevo cuando quieras.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-8">
          {conBono ? (
            <section className="mia-card-dark">
              <p className="mia-eyebrow">Bono · solo hasta el {fechaLimiteLegible()}</p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{CLASE_PRIVADA.titulo}</h2>
              <p className="mia-lead mt-3">{CLASE_PRIVADA.resumen}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {CLASE_PRIVADA.incluye.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span aria-hidden="true" className="text-[var(--mia-accent)]">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
              <p className="mia-label mt-7 !text-[var(--mia-dark-muted)]">El bono se cierra en</p>
              <Countdown hasta={FECHA_LIMITE_BONO.toISOString()} />
              <p className="mt-4 text-xs text-[var(--mia-dark-muted)]">
                Solo para quienes se inscriben antes del cierre. Después, la clase privada no se vuelve a ofrecer.
              </p>
            </section>
          ) : null}

          <section>
            <p className="mia-eyebrow">Qué incluye</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PUNTOS.map(([t, d]) => (
                <article key={t} className="mia-card-soft !p-5">
                  <h3 className="text-base font-semibold">{t}</h3>
                  <p className="mia-muted mt-1 text-sm leading-relaxed">{d}</p>
                </article>
              ))}
            </div>
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
            <p className="mt-3 font-[family-name:var(--mia-font-display)] text-4xl font-bold tracking-tight">
              {precio} <span className="mia-muted text-base font-normal">USD · pago único</span>
            </p>
            <div className="mt-6">
              <FormCompra precio={precio} origen={o === "stand" ? "stand" : "web"} />
            </div>
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
