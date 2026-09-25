import type { CSSProperties } from "react";
import { FIRST_MONTH } from "@/content/imt";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";

/** First month timeline; the line fills as you scroll (CSS scroll-driven). */
export function FirstMonth() {
  return (
    <section aria-labelledby="primer-mes-title" className="relative py-16 sm:py-28">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:gap-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
        <header data-reveal="" className="lg:sticky lg:top-32 lg:self-start">
          <Eyebrow>Tu primer mes</Eyebrow>
          <h2 id="primer-mes-title" className="mt-4 text-balance text-[2rem] font-bold leading-[1.05] sm:text-5xl">
            De la primera llamada a <span className="imt-text-glow">algo funcionando.</span>
          </h2>
          <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-imt-muted sm:mt-5 sm:text-lg">
            Sin meses de espera: una entrega en producción cada semana desde el primer sprint.
          </p>
        </header>

        {/* The rail lives outside the <ol> so the list only contains <li> items. */}
        <div className="relative pl-11 sm:pl-16">
          <span aria-hidden="true" className="absolute bottom-2 left-[15px] top-4 w-0.5 rounded-full bg-imt-border-solid sm:left-[23px]" />
          <span aria-hidden="true" className="imt-timeline-fill absolute bottom-2 left-[15px] top-4 w-0.5 rounded-full bg-imt-accent sm:left-[23px]" />
          <ol className="imt-timeline space-y-4 sm:space-y-6">
            {FIRST_MONTH.map((step, i) => (
              <li
                key={step.week}
                data-reveal=""
                style={{ "--reveal-delay": `${i * 60}ms` } as CSSProperties}
                className="imt-timeline-item relative"
              >
                <span
                  aria-hidden="true"
                  className="imt-timeline-dot absolute -left-11 top-4 inline-flex size-8 items-center justify-center rounded-full border-2 border-imt-border-solid bg-imt-bg font-imt-mono text-xs text-imt-muted sm:-left-16 sm:top-6 sm:size-12 sm:text-sm"
                >
                  {i + 1}
                </span>
                <div data-spotlight="" className="imt-card p-5 sm:p-8">
                  <p className="font-imt-mono text-xs uppercase tracking-[0.2em] text-imt-accent">{step.week}</p>
                  <h3 className="mt-2 text-xl font-bold leading-tight sm:mt-3 sm:text-2xl">{step.title}</h3>
                  <p className="mt-2 text-pretty text-[15px] leading-relaxed text-imt-muted sm:text-base">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
