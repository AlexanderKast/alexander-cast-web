import { FAQS } from "@/content/imt";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { FaqAccordion } from "./FaqAccordion";

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
        <header data-reveal="" className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="faq-title" className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
            Preguntas frecuentes
          </h2>
          <p className="mt-4 max-w-sm text-pretty text-imt-muted">
            Toca una pregunta para abrirla. Con las flechas del teclado también puedes moverte entre ellas.
          </p>
        </header>
        <div data-reveal="" className="rounded-3xl border border-imt-border bg-imt-bg/90 px-5 backdrop-blur sm:rounded-[2rem] sm:px-8">
          <FaqAccordion items={FAQS} />
        </div>
      </div>
    </section>
  );
}
