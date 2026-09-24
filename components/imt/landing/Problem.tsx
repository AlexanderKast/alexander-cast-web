import { PROBLEMS } from "@/content/imt";
import { Card } from "@/components/imt/ui/Card";
import { Section, SectionHeader } from "@/components/imt/ui/Section";
import { PROBLEM_ICONS } from "./icons";

export function Problem() {
  return (
    <Section id="problema" labelledBy="problema-title" className="border-t border-imt-border bg-imt-elev">
      <SectionHeader id="problema-title" eyebrow="Tu empresa está vendiendo" title="¿Pero cuánto te cuesta operarla?" />

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROBLEMS.map((problem, i) => {
          const Icon = PROBLEM_ICONS[problem.icon];
          return (
            <Card key={problem.text} as="li" reveal delay={i * 80} className="flex flex-col gap-5">
              <span className="inline-flex size-11 items-center justify-center rounded-xl border border-imt-border bg-imt-bg text-imt-cyan">
                <Icon className="size-5" strokeWidth={1.6} aria-hidden />
              </span>
              <p className="text-pretty text-base leading-relaxed text-imt-text">{problem.text}</p>
            </Card>
          );
        })}
      </ul>

      <p
        data-reveal=""
        className="mt-14 text-balance text-center font-imt-display text-3xl font-bold leading-tight sm:text-4xl"
      >
        No te falta equipo. <span className="imt-text-glow">Te faltan sistemas.</span>
      </p>
    </Section>
  );
}
