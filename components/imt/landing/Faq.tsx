import { FAQS } from "@/content/imt";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { FaqAccordion } from "./FaqAccordion";

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
        <header data-reveal="" className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="faq-title" className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
            Preguntas frecuentes
          </h2>
        </header>
        <div data-reveal="" className="rounded-[2rem] border border-imt-border bg-imt-bg/90 px-6 backdrop-blur sm:px-8">
          <FaqAccordion items={FAQS} />
        </div>
      </div>
    </section>
  );
}
