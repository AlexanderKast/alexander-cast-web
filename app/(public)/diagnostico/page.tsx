import type { Metadata } from "next";
import { Suspense } from "react";
import { DiagnosticoForm } from "@/components/imt/diagnostico/DiagnosticoForm";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Agenda tu diagnóstico",
  description:
    "Cuéntanos cómo opera tu empresa hoy. Te escribimos en menos de 24 horas hábiles para agendar el diagnóstico con IA Master Tech.",
  path: "/diagnostico",
});

const NEXT_STEPS = [
  { title: "Llenas el formulario", text: "Unos 3 minutos. Nos cuentas cómo opera tu empresa y qué te duele." },
  { title: "Te escribimos", text: "En menos de 24 horas hábiles, por WhatsApp o correo." },
  { title: "Diagnóstico de 30 minutos", text: "Mapeamos procesos y cuellos de botella, y priorizamos por impacto." },
];

export default function DiagnosticoPage() {
  const calLink = process.env.NEXT_PUBLIC_CAL_LINK || undefined;

  return (
    <section aria-labelledby="diagnostico-title" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:px-6 sm:pt-36 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>IA Master Tech · Diagnóstico</Eyebrow>
          <h1 id="diagnostico-title" className="mt-4 text-balance text-4xl font-bold leading-tight sm:text-5xl">
            Agenda tu diagnóstico
          </h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-imt-muted">
            Cuéntanos cómo opera tu empresa hoy. Con esto llegamos a la llamada sabiendo qué conviene construir primero.
          </p>

          <ol className="mt-10 space-y-6">
            {NEXT_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-imt-cyan font-imt-mono text-sm text-imt-cyan">
                  {i + 1}
                </span>
                <div>
                  <p className="font-imt-display text-lg font-bold text-imt-text">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-imt-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Suspense fallback={<div className="imt-card min-h-[720px]" aria-hidden="true" />}>
          <DiagnosticoForm calLink={calLink} />
        </Suspense>
      </div>
    </section>
  );
}
