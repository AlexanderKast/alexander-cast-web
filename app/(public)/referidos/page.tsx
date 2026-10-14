import type { Metadata } from "next";
import { ReferidoForm } from "@/components/imt/pagos/ReferidoForm";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { PLANS, formatCop } from "@/content/imt";
import { calcularComision, COMISION_PCT, VENTANA_REFERIDO_DIAS } from "@/lib/imt/pagos";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Programa de referidos",
  description: `Recomienda IA Master Tech y gana el ${COMISION_PCT}% del primer pago de cada empresa que contrate un plan.`,
  path: "/referidos",
});

const REGLAS = [
  `Ganas el ${COMISION_PCT}% del primer pago de cada empresa que contrata un plan desde tu enlace.`,
  `La atribución dura ${VENTANA_REFERIDO_DIAS} días desde que la empresa entra por tu enlace.`,
  "Solo comisiona el primer pago, sea mensual o anual.",
  "Pagamos por transferencia cuando el pago del cliente está confirmado. Lo coordinamos por WhatsApp.",
  "No aplica para compras propias ni de tu empresa. Si el cliente es reembolsado, la comisión se anula.",
];

const PASOS = [
  { titulo: "Pide tu enlace", texto: "Déjanos tu correo. Te llega un enlace personal y un panel privado." },
  { titulo: "Compártelo", texto: "Con empresas que pierdan horas en tareas manuales: la persona entra, ve los planes y contrata." },
  { titulo: "Cobra", texto: "Cuando la empresa paga, tu comisión aparece en tu panel y te avisamos." },
];

export default function ReferidosPage() {
  return (
    <section aria-labelledby="referidos-title" className="relative isolate mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8">
      <div aria-hidden="true" className="imt-dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-60" />
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <Eyebrow>IA Master Tech · Referidos</Eyebrow>
          <h1 id="referidos-title" className="mt-4 text-balance text-[2.25rem] font-bold leading-tight sm:text-5xl">
            Recomienda y gana el <span className="imt-text-glow">{COMISION_PCT}%</span>
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-imt-muted sm:text-lg">
            Si conoces una empresa que necesita automatizar o construir software, preséntala. Cuando contrate un plan, te
            pagamos una comisión.
          </p>

          <ul className="mt-8 grid gap-3">
            {PLANS.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-4 rounded-2xl border border-imt-border bg-imt-surface px-5 py-4">
                <span className="font-imt-mono text-sm tracking-[0.2em] text-imt-text">{p.name}</span>
                <span className="text-right text-sm text-imt-muted">
                  primer mes {formatCop(p.priceCop)} →{" "}
                  <strong className="text-imt-accent">{formatCop(calcularComision(p.priceCop))}</strong> para ti
                </span>
              </li>
            ))}
          </ul>

          <ol className="mt-10 space-y-5">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-imt-accent font-imt-mono text-sm text-imt-accent">
                  {i + 1}
                </span>
                <div>
                  <p className="font-imt-display text-lg font-bold">{p.titulo}</p>
                  <p className="mt-1 text-sm leading-relaxed text-imt-muted">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-10 font-imt-display text-xl font-bold">Reglas del programa</h2>
          <ul className="mt-3 space-y-2 text-sm text-imt-muted">
            {REGLAS.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden="true" className="text-imt-accent">·</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <ReferidoForm />
        </div>
      </div>
    </section>
  );
}
