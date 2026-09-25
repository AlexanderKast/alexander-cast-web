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
    <section aria-labelledby="diagnostico-title" className="relative isolate mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8">
      <div aria-hidden="true" className="imt-dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-60" />
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700 motion-reduce:slide-in-from-bottom-0 lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>IA Master Tech · Diagnóstico</Eyebrow>
          <h1 id="diagnostico-title" className="mt-4 text-balance text-[2.25rem] font-bold leading-tight sm:text-5xl">
            Agenda tu diagnóstico
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-imt-muted sm:mt-5 sm:text-lg">
            Cuéntanos cómo opera tu empresa hoy. Con esto llegamos a la llamada sabiendo qué conviene construir primero.
          </p>

          <ol className="relative mt-8 space-y-6 sm:mt-10">
            <span aria-hidden="true" className="absolute bottom-4 left-[17px] top-4 w-px bg-gradient-to-b from-imt-accent via-imt-border-solid to-transparent" />
            {NEXT_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative flex animate-in gap-4 fade-in slide-in-from-left-2 fill-mode-both duration-700 motion-reduce:slide-in-from-left-0"
                style={{ animationDelay: `${250 + i * 150}ms` }}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-imt-accent bg-imt-bg font-imt-mono text-sm text-imt-accent">
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

        <Suspense fallback={<div className="imt-card min-h-[560px] animate-pulse sm:min-h-[640px]" aria-hidden="true" />}>
          <DiagnosticoForm calLink={calLink} />
        </Suspense>
      </div>
    </section>
  );
}
