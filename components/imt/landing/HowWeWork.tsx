import { RESULTS, STEPS } from "@/content/imt";
import { cn } from "@/lib/utils";
import { Card } from "@/components/imt/ui/Card";
import { GlowBorder } from "@/components/imt/ui/GlowBorder";
import { Section, SectionHeader } from "@/components/imt/ui/Section";
import { RESULT_ICONS, STEP_ICONS } from "./icons";
import { Marquee } from "./Marquee";

// Bento spans. sm (2 cols): 2 / 1+1 / 1+1 / 2. lg (6 cols): 4+2 / 2+2+2 / 6.
const BENTO_SPANS = [
  "sm:col-span-2 lg:col-span-4",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "sm:col-span-2 lg:col-span-6",
];

export function HowWeWork() {
  return (
    <Section id="como-trabajamos" labelledBy="como-title">
      <SectionHeader id="como-title" eyebrow="Qué hacemos" title="Nos convertimos en tu equipo de desarrollo." />

      <div className="mt-10" data-reveal="">
        <Marquee />
      </div>

      <ol className="mt-14 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = STEP_ICONS[step.icon];
          return (
            <Card key={step.title} as="li" reveal delay={i * 100} className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-imt-border bg-imt-bg text-imt-cyan">
                  <Icon className="size-5" strokeWidth={1.6} aria-hidden />
                </span>
                <span className="font-imt-mono text-sm text-imt-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-2xl font-bold">{step.title}</h3>
              <p className="mt-3 text-pretty leading-relaxed text-imt-muted">{step.text}</p>
            </Card>
          );
        })}
      </ol>

      <h3 className="sr-only">Resultados</h3>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {RESULTS.map((result, i) => {
          const Icon = RESULT_ICONS[result.icon];
          const featured = result.icon === "ownership";
          return (
            <GlowBorder
              key={result.title}
              as="li"
              reveal
              delay={i * 70}
              active={featured}
              className={cn(
                "flex gap-5 p-6 sm:p-7",
                featured ? "flex-col sm:flex-row sm:items-center" : "flex-col",
                BENTO_SPANS[i],
              )}
            >
              <span
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border",
                  featured ? "border-imt-cyan bg-imt-cyan text-imt-bg" : "border-imt-border bg-imt-bg text-imt-cyan",
                )}
              >
                <Icon className="size-5" strokeWidth={1.6} aria-hidden />
              </span>
              <div>
                <h4 className="text-lg font-bold">{result.title}</h4>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-imt-muted">{result.text}</p>
              </div>
            </GlowBorder>
          );
        })}
      </ul>
    </Section>
  );
}
