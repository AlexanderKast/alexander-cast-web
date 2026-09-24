import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/imt/ui/Button";
import { Counter } from "@/components/imt/ui/Counter";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { CircuitBackground } from "./CircuitBackground";
import { CursorGlow } from "./CursorGlow";
import { PauseWhenHidden } from "./PauseWhenHidden";
import { SprintLog } from "./SprintLog";

/** Splits a word into letters that fade in one by one (CSS, see .imt-letter). */
function Letters({ word, start, className }: { word: string; start: number; className?: string }) {
  return (
    <span className={className}>
      {Array.from(word).map((char, i) => (
        <span key={i} className="imt-letter" style={{ "--i": start + i } as CSSProperties}>
          {char}
        </span>
      ))}
    </span>
  );
}

const STATS = [
  { value: <><Counter value={10} />–<Counter value={30} /> h</>, label: "de desarrollo por semana" },
  { value: <><Counter value={4} /> sprints</>, label: "al mes, una entrega cada semana" },
  { value: <><Counter value={100} />%</>, label: "propiedad: código y accesos a tu nombre" },
];

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative isolate overflow-hidden pb-16 pt-28 sm:pt-36 lg:pb-24">
      <PauseWhenHidden className="absolute inset-0 -z-10">
        <CircuitBackground />
        <CursorGlow />
      </PauseWhenHidden>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-8">
        <div>
          <Eyebrow>Alexander Cast presenta · IA Master Tech</Eyebrow>

          <h1
            id="hero-title"
            className="mt-6 text-[clamp(2.75rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.04em]"
          >
            <span className="sr-only">OPERAR vs. ESCALAR</span>
            <span aria-hidden="true" className="block">
              <Letters word="OPERAR" start={0} />
              <span className="imt-letter mx-[0.18em] align-middle text-[0.45em] font-medium tracking-normal text-imt-muted" style={{ "--i": 6 } as CSSProperties}>
                vs.
              </span>
              <Letters word="ESCALAR" start={7} className="imt-text-glow inline-block" />
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-imt-text sm:text-xl">
            El punto en el que tu empresa deja de depender de tareas manuales y empieza a crecer con sistemas.
          </p>
          <p className="mt-4 font-imt-mono text-sm text-imt-cyan">
            Operar te mantiene vivo. Los sistemas te hacen escalar.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/diagnostico" size="lg">
              Agenda tu diagnóstico
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button href="/#planes" variant="secondary" size="lg">
              Ver planes
            </Button>
          </div>
          <p className="mt-5 text-sm text-imt-muted">
            Cupos fundadores limitados <span aria-hidden="true" className="mx-1.5 text-imt-cyan">·</span> Una
            entrega funcionando cada semana
          </p>
        </div>

        <PauseWhenHidden>
          <SprintLog />
        </PauseWhenHidden>
      </div>

      <div className="mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6 lg:mt-20 lg:px-8">
        <dl className="grid overflow-hidden rounded-3xl border border-imt-border bg-imt-border sm:grid-cols-3 sm:gap-px">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              data-reveal=""
              style={{ "--reveal-delay": `${i * 90}ms` } as CSSProperties}
              className="flex flex-col gap-1 bg-imt-bg px-6 py-6 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-imt-border sm:[&:not(:first-child)]:border-t-0"
            >
              <dt className="order-2 text-sm text-imt-muted">{stat.label}</dt>
              <dd className="order-1 font-imt-display text-3xl font-bold text-imt-text sm:text-4xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
