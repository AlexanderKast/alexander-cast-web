import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowDown, ArrowRight } from "lucide-react";
import heroImage from "@/public/images/imt/hero.webp";
import { Button } from "@/components/imt/ui/Button";
import { Counter } from "@/components/imt/ui/Counter";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { diagnosticoHref } from "@/content/imt";

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
    <section id="inicio" aria-labelledby="hero-title" className="relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:px-8">
        <div className="relative z-10">
          <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-imt-accent/40 bg-imt-bg/80 px-4 py-1.5 text-sm text-imt-text backdrop-blur">
            <span className="relative flex size-2.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-imt-accent opacity-70 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2.5 rounded-full bg-imt-accent" />
            </span>
            Cupos fundadores abiertos este trimestre
          </p>
          <Eyebrow>Alexander Cast presenta · IA Master Tech</Eyebrow>

          <h1 id="hero-title" className="mt-6 text-[clamp(3rem,10vw,6.5rem)] font-bold leading-[0.9] tracking-[-0.045em]">
            <span className="sr-only">OPERAR vs. ESCALAR</span>
            <span aria-hidden="true" className="block">
              <Letters word="OPERAR" start={0} className="block text-imt-muted" />
              <span
                className="imt-letter my-1 block font-imt-mono text-[0.22em] font-medium uppercase tracking-[0.3em] text-imt-accent"
                style={{ "--i": 6 } as CSSProperties}
              >
                — vs. —
              </span>
              <Letters word="ESCALAR" start={7} className="imt-text-glow block" />
            </span>
          </h1>

          <p className="mt-8 max-w-lg text-pretty text-lg leading-relaxed text-imt-text sm:text-xl">
            El punto en el que tu empresa deja de depender de tareas manuales y empieza a crecer con sistemas.
          </p>
          <p className="mt-4 border-l-2 border-imt-accent pl-4 font-imt-mono text-sm text-imt-accent">
            Operar te mantiene vivo. Los sistemas te hacen escalar.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href={diagnosticoHref()} size="lg">
              Agenda tu diagnóstico
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button href="/planes" variant="secondary" size="lg">
              Ver planes
            </Button>
          </div>
          <p className="mt-5 text-sm text-imt-muted">
            Cupos fundadores limitados <span aria-hidden="true" className="mx-1.5 text-imt-accent">·</span> Una
            entrega funcionando cada semana
          </p>
        </div>

        <div className="imt-parallax relative">
          <div
            aria-hidden="true"
            className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(closest-side,rgba(163,230,53,0.28),rgba(5,7,5,0))]"
          />
          <figure
            data-tilt=""
            data-spotlight=""
            className="relative transition-transform duration-300 ease-out"
          >
            <Image
              src={heroImage}
              alt="Cables enredados y papeles que se transforman en un circuito ordenado de módulos de datos iluminados en verde"
              placeholder="blur"
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="imt-img-fade h-auto w-full"
            />
            <figcaption className="absolute bottom-3 left-1/2 flex w-[min(80%,22rem)] -translate-x-1/2 items-center justify-between rounded-full border border-imt-border bg-imt-bg/80 px-5 py-2 font-imt-mono text-[11px] uppercase tracking-[0.18em] text-imt-muted backdrop-blur">
              <span>Operar</span>
              <span aria-hidden="true" className="h-px flex-1 mx-4 bg-imt-border-solid" />
              <span className="text-imt-accent">Escalar</span>
            </figcaption>
          </figure>

          {/* Illustrative status chips floating around the image. */}
          <ul aria-hidden="true" className="pointer-events-none">
            {[
              { text: "Pedido sincronizado", className: "-left-3 top-6 sm:-left-8", delay: "0s", pop: 1400 },
              { text: "Cotización enviada", className: "-right-3 top-1/3 sm:-right-6", delay: "1.2s", pop: 1650 },
              { text: "Tablero actualizado", className: "bottom-14 left-6 sm:-left-4", delay: "2.1s", pop: 1900 },
            ].map((chip) => (
              <li
                key={chip.text}
                className={`imt-letter absolute ${chip.className}`}
                style={{ animationDelay: `${chip.pop}ms` } as CSSProperties}
              >
                <span
                  className="imt-float flex items-center gap-2 rounded-full border border-imt-accent/50 bg-imt-bg/90 px-3.5 py-2 text-xs font-medium text-imt-text shadow-[0_10px_30px_-10px_rgba(163,230,53,0.6)] backdrop-blur sm:text-sm"
                  style={{ "--float-delay": chip.delay } as CSSProperties}
                >
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-imt-accent text-[10px] font-bold text-imt-bg">✓</span>
                  {chip.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <a
        href="#problema"
        className="mx-auto mt-14 flex w-fit flex-col items-center gap-2 rounded-full px-3 py-2 font-imt-mono text-[11px] uppercase tracking-[0.24em] text-imt-muted transition-colors hover:text-imt-accent"
      >
        Scroll
        <ArrowDown className="imt-scroll-hint size-4" aria-hidden />
      </a>

      <div className="mx-auto mt-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <dl className="grid overflow-hidden rounded-3xl border border-imt-border bg-imt-border sm:grid-cols-3 sm:gap-px">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              data-reveal=""
              style={{ "--reveal-delay": `${i * 90}ms` } as CSSProperties}
              className="flex flex-col gap-1 bg-imt-bg/90 px-6 py-7 backdrop-blur [&:not(:first-child)]:border-t [&:not(:first-child)]:border-imt-border sm:[&:not(:first-child)]:border-t-0"
            >
              <dt className="order-2 text-sm text-imt-muted">{stat.label}</dt>
              <dd className="order-1 font-imt-display text-4xl font-bold text-imt-accent sm:text-5xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
