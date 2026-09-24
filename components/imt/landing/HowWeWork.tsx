import Image from "next/image";
import { RESULTS, STEPS } from "@/content/imt";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { GlowBorder } from "@/components/imt/ui/GlowBorder";
import { PauseWhenHidden } from "./PauseWhenHidden";
import { RESULT_ICONS, STEP_ICONS } from "./icons";
import { SprintLog } from "./SprintLog";

/** The three steps as alternating image / text rows. */
export function StepsZigzag() {
  return (
    <section aria-labelledby="pasos-title" className="relative py-16 sm:py-24">
      <h2 id="pasos-title" className="sr-only">
        Los tres pasos
      </h2>
      <ol className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 sm:gap-28 sm:px-6 lg:px-8">
        {STEPS.map((step, i) => {
          const Icon = STEP_ICONS[step.icon];
          const reversed = i % 2 === 1;
          return (
            <li key={step.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <figure data-reveal="" className={cn("relative", reversed && "lg:order-2")}>
                <div className="overflow-hidden rounded-[2rem] border border-imt-border bg-imt-bg">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    width={1024}
                    height={1024}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="h-auto w-full"
                  />
                </div>
                <span
                  aria-hidden="true"
                  className="absolute -top-6 left-6 font-imt-display text-8xl font-bold leading-none text-imt-accent/90 [-webkit-text-stroke:0] sm:text-9xl"
                >
                  0{i + 1}
                </span>
              </figure>

              <div data-reveal="" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
                <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-imt-accent bg-imt-bg text-imt-accent">
                  <Icon className="size-6" strokeWidth={1.6} aria-hidden />
                </span>
                <h3 className="mt-6 text-4xl font-bold sm:text-5xl">{step.title}</h3>
                <p className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-imt-muted sm:text-xl">{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Illustrative weekly sprint log next to a short explanation. */
export function WeeklyLog() {
  return (
    <section aria-labelledby="semana-title" className="relative py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <div data-reveal="">
          <Eyebrow>Una semana con nosotros</Eyebrow>
          <h2 id="semana-title" className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
            Cada viernes, algo nuevo funcionando.
          </h2>
          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-imt-muted">
            Un sprint semanal con entrega en producción, tablero compartido y canal directo. Así avanza el trabajo.
          </p>
        </div>
        <PauseWhenHidden>
          <SprintLog />
        </PauseWhenHidden>
      </div>
    </section>
  );
}

// Bento spans. sm (2 cols): 2 / 1+1 / 1+1 / 2. lg (6 cols): 4+2 / 2+2+2 / 6.
const BENTO_SPANS = [
  "sm:col-span-2 lg:col-span-4",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "sm:col-span-2 lg:col-span-6",
];

/** The six outcomes as a bento grid. */
export function ResultsBento() {
  return (
    <section aria-labelledby="resultados-title" className="relative py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header data-reveal="">
          <Eyebrow>Lo que ganas</Eyebrow>
          <h2 id="resultados-title" className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
            Sistemas que trabajan mientras tú vendes.
          </h2>
        </header>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
                  "flex gap-5 p-7 sm:p-8",
                  featured ? "flex-col sm:flex-row sm:items-center" : "flex-col",
                  BENTO_SPANS[i],
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border",
                    featured ? "border-imt-accent bg-imt-accent text-imt-bg" : "border-imt-border bg-imt-bg text-imt-accent",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.6} aria-hidden />
                </span>
                <div>
                  <h3 className="text-xl font-bold">{result.title}</h3>
                  <p className="mt-2 text-pretty leading-relaxed text-imt-muted">{result.text}</p>
                </div>
              </GlowBorder>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
