import Image from "next/image";
import { PROBLEMS } from "@/content/imt";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { PROBLEM_ICONS } from "./icons";

export function Problem() {
  return (
    <section id="problema" aria-labelledby="problema-title" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <figure data-reveal="" className="relative order-2 lg:order-1">
            <div className="overflow-hidden rounded-[2rem] border border-imt-border">
              <Image
                src="/images/imt/problema.webp"
                alt="Escritorio de noche lleno de hojas de cálculo impresas, notas y celulares con notificaciones"
                width={1536}
                height={1024}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="absolute -bottom-5 left-5 rounded-full border border-imt-border bg-imt-bg px-4 py-2 font-imt-mono text-[11px] uppercase tracking-[0.18em] text-imt-muted sm:left-8">
              Así se ve <span className="text-imt-accent">operar</span> sin sistemas
            </figcaption>
          </figure>

          <div className="order-1 lg:order-2">
            <header data-reveal="">
              <Eyebrow>Tu empresa está vendiendo</Eyebrow>
              <h2 id="problema-title" className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
                ¿Pero cuánto te cuesta operarla?
              </h2>
            </header>

            <ul className="mt-10 divide-y divide-imt-border border-y border-imt-border">
              {PROBLEMS.map((problem, i) => {
                const Icon = PROBLEM_ICONS[problem.icon];
                return (
                  <li
                    key={problem.text}
                    data-reveal=""
                    style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}
                    className="flex items-center gap-5 py-5"
                  >
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-imt-border bg-imt-surface text-imt-accent">
                      <Icon className="size-5" strokeWidth={1.6} aria-hidden />
                    </span>
                    <p className="text-pretty text-lg leading-snug text-imt-text">{problem.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p
          data-reveal=""
          className="mx-auto mt-20 max-w-4xl text-balance text-center font-imt-display text-4xl font-bold leading-[1.05] sm:text-6xl"
        >
          No te falta equipo. <span className="imt-text-glow">Te faltan sistemas.</span>
        </p>
      </div>
    </section>
  );
}
