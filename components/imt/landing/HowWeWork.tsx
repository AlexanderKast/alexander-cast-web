import Image from "next/image";
import { RESULT_EXAMPLES, RESULTS, STEP_DELIVERABLES, STEPS } from "@/content/imt";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { FlipCard } from "@/components/imt/ui/FlipCard";
import { StepDetails } from "./StepDetails";
import { PauseWhenHidden } from "./PauseWhenHidden";
import { RESULT_ICONS, STEP_ICONS } from "./icons";
import { SprintLog } from "./SprintLog";
import type { StepIcon } from "@/content/imt";
import type { StaticImageData } from "next/image";
import diagnosticamosImage from "@/public/images/imt/diagnosticamos.webp";
import construimosImage from "@/public/images/imt/construimos.webp";
import operamosImage from "@/public/images/imt/operamos.webp";

const STEP_IMAGES: Record<StepIcon, StaticImageData> = {
  diagnose: diagnosticamosImage,
  build: construimosImage,
  operate: operamosImage,
};

/** The three steps as alternating image / text rows. */
export function StepsZigzag() {
  return (
    <section aria-labelledby="pasos-title" className="relative py-16 sm:py-24">
      <h2 id="pasos-title" className="sr-only">
        Los tres pasos
      </h2>
      <ol className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 sm:gap-24 sm:px-6 lg:gap-28 lg:px-8">
        {STEPS.map((step, i) => {
          const Icon = STEP_ICONS[step.icon];
          const reversed = i % 2 === 1;
          return (
            <li key={step.title} className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-20">
              <figure className={cn("relative isolate mx-auto w-full max-w-xl lg:max-w-none", reversed && "lg:order-2")}>
                {/* Soft glow behind the faded image edges, so the mask reads as intentional. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-[12%] -z-10 rounded-full bg-imt-accent/15 blur-3xl sm:blur-[80px]"
                />
                <div
                  aria-hidden="true"
                  className="imt-dots absolute inset-0 -z-10 opacity-60 lg:-inset-6"
                />
                <div data-reveal="" data-tilt="" className="imt-reveal-img relative aspect-[4/3]">
                  <Image
                    src={STEP_IMAGES[step.icon]}
                    alt={step.alt}
                    placeholder="blur"
                    fill
                    sizes="(min-width: 1024px) 45vw, (min-width: 640px) 576px, 100vw"
                    className="imt-img-fade object-cover"
                  />
                </div>
                <span
                  aria-hidden="true"
                  className="absolute -top-4 left-2 z-10 font-imt-display text-7xl font-bold leading-none text-imt-accent drop-shadow-[0_0_24px_rgba(163,230,53,0.6)] sm:-top-6 sm:left-6 sm:text-9xl"
                >
                  0{i + 1}
                </span>
              </figure>

              <div data-reveal="" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
                <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-imt-accent bg-imt-bg text-imt-accent sm:size-14">
                  <Icon className="size-6" strokeWidth={1.6} aria-hidden />
                </span>
                <h3 className="mt-5 text-3xl font-bold sm:mt-6 sm:text-5xl">{step.title}</h3>
                <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-imt-muted sm:mt-5 sm:text-xl">{step.text}</p>
                <StepDetails items={STEP_DELIVERABLES[step.icon]} />
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
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 sm:gap-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
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
          <p className="mt-4 text-imt-muted">Toca una tarjeta para ver un ejemplo real.</p>
        </header>
        <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-6">
          {RESULTS.map((result, i) => {
            const Icon = RESULT_ICONS[result.icon];
            const featured = result.icon === "ownership";
            return (
              <li
                key={result.title}
                data-reveal=""
                style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}
                className={BENTO_SPANS[i]}
              >
                <FlipCard
                  label={result.title}
                  className="h-full"
                  featured={featured}
                  back={RESULT_EXAMPLES[result.icon]}
                  front={
                    <span className={cn("flex gap-5", featured ? "flex-col sm:flex-row sm:items-center" : "flex-col")}>
                      <span
                        className={cn(
                          "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border",
                          featured ? "border-imt-accent bg-imt-accent text-imt-bg" : "border-imt-border bg-imt-bg text-imt-accent",
                        )}
                      >
                        <Icon className="size-5" strokeWidth={1.6} aria-hidden />
                      </span>
                      <span>
                        <span className="block font-imt-display text-lg font-bold text-imt-text sm:text-xl">{result.title}</span>
                        <span className="mt-2 block text-pretty leading-relaxed text-imt-muted">{result.text}</span>
                      </span>
                    </span>
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
