import type { CSSProperties } from "react";
import Image from "next/image";
import { PROBLEMS } from "@/content/imt";
import problemaImage from "@/public/images/imt/problema.webp";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { PROBLEM_ICONS } from "./icons";

export function Problem() {
  return (
    <section id="problema" aria-labelledby="problema-title" className="relative py-16 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <figure data-tilt="" className="relative order-2 mx-auto w-full max-w-xl lg:order-1 lg:max-w-none">
            <div data-reveal="" className="imt-reveal-img">
              <Image
                src={problemaImage}
                alt="Escritorio de noche lleno de hojas de cálculo impresas, notas y celulares con notificaciones"
                placeholder="blur"
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="imt-img-fade h-auto w-full"
              />
            </div>
            <figcaption className="absolute -bottom-4 left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-imt-border bg-imt-bg px-4 py-2 text-center font-imt-mono text-[10px] uppercase tracking-[0.16em] text-imt-muted sm:-bottom-5 sm:left-8 sm:translate-x-0 sm:text-[11px] sm:tracking-[0.18em]">
              Así se ve <span className="text-imt-accent">operar</span> sin sistemas
            </figcaption>
          </figure>

          <div className="order-1 lg:order-2">
            <header data-reveal="">
              <Eyebrow>Tu empresa está vendiendo</Eyebrow>
              <h2 id="problema-title" className="mt-4 text-balance text-[2rem] font-bold leading-[1.05] sm:text-5xl">
                ¿Pero cuánto te cuesta operarla?
              </h2>
            </header>

            <ul className="mt-8 divide-y divide-imt-border border-y border-imt-border sm:mt-10">
              {PROBLEMS.map((problem, i) => {
                const Icon = PROBLEM_ICONS[problem.icon];
                return (
                  <li
                    key={problem.text}
                    data-reveal=""
                    style={{ "--reveal-delay": `${i * 80}ms` } as CSSProperties}
                    className="flex items-center gap-4 py-4 sm:gap-5 sm:py-5"
                  >
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-imt-border bg-imt-surface text-imt-accent sm:size-12 sm:rounded-2xl">
                      <Icon className="size-5" strokeWidth={1.6} aria-hidden />
                    </span>
                    <p className="text-pretty text-base leading-snug text-imt-text sm:text-lg">{problem.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <p
          data-reveal=""
          className="mx-auto mt-16 max-w-4xl text-balance text-center font-imt-display text-[2.125rem] font-bold leading-[1.05] sm:mt-24 sm:text-6xl"
        >
          No te falta equipo. <span className="imt-text-glow">Te faltan sistemas.</span>
        </p>
      </div>
    </section>
  );
}
