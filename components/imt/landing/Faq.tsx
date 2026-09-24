import { ArrowRight } from "lucide-react";
import { FAQS } from "@/content/imt";
import { Button } from "@/components/imt/ui/Button";
import { Section, SectionHeader } from "@/components/imt/ui/Section";
import { FaqAccordion } from "./FaqAccordion";

export function Faq() {
  return (
    <Section id="faq" labelledBy="faq-title" className="border-t border-imt-border bg-imt-elev">
      <SectionHeader id="faq-title" eyebrow="FAQ" title="Preguntas frecuentes" />

      <div className="mt-10" data-reveal="">
        <FaqAccordion items={FAQS} />
      </div>

      <div
        data-reveal=""
        className="relative mt-20 overflow-hidden rounded-3xl border border-imt-cyan bg-imt-bg px-6 py-14 text-center shadow-[0_30px_100px_-40px_rgba(34,211,238,0.6)] sm:px-12 sm:py-20"
      >
        <h2 className="mx-auto max-w-3xl text-balance text-3xl font-bold leading-tight sm:text-5xl">
          Tu empresa ya vende. <span className="imt-text-glow">Ahora necesita sistemas que crezcan con ella.</span>
        </h2>
        <div className="mt-10 flex justify-center">
          <Button href="/diagnostico" size="lg">
            Agenda tu diagnóstico
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </Section>
  );
}
