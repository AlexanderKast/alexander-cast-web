import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatCop, PLANS } from "@/content/imt";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import construimosImage from "@/public/images/imt/construimos.webp";
import operamosImage from "@/public/images/imt/operamos.webp";
import estudioImage from "@/public/images/imt/estudio.webp";

const lowestPrice = Math.min(...PLANS.map((p) => p.priceCop));

const CARDS = [
  {
    href: "/como-trabajamos",
    eyebrow: "01 · Cómo trabajamos",
    title: "Diagnosticamos, construimos y operamos.",
    text: "Un sprint semanal que ves funcionando en producción.",
    image: construimosImage,
    alt: "Brazo robótico ensamblando módulos de software conectados",
  },
  {
    href: "/planes",
    eyebrow: "02 · Planes",
    title: `Desde ${formatCop(lowestPrice)} al mes.`,
    text: "Un equipo de desarrollo completo por menos que un empleado.",
    image: operamosImage,
    alt: "Tablero de monitoreo con gráficas en vivo",
  },
  {
    href: "/nosotros",
    eyebrow: "03 · Equipo",
    title: "Estrategia y código en la misma mesa.",
    text: "Alexander y Samuel Castaño, sin intermediarios.",
    image: estudioImage,
    alt: "Estudio de desarrollo de noche con dos monitores y un tablero de estrategia",
  },
];

export function Explore() {
  return (
    <section aria-labelledby="explora-title" className="relative py-16 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header data-reveal="">
          <Eyebrow>Qué hacemos</Eyebrow>
          <h2 id="explora-title" className="mt-4 max-w-2xl text-balance text-[2rem] font-bold leading-[1.05] sm:text-5xl">
            Nos convertimos en tu equipo de desarrollo.
          </h2>
        </header>

        {/*
          Phones: stacked cards with a short image. sm–md: horizontal cards (image left, fading right),
          so three items never leave an orphan in a 2-column grid. lg+: three equal-height columns.
        */}
        <ul className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-3">
          {CARDS.map((card, i) => (
            <li
              key={card.href}
              data-reveal=""
              data-tilt=""
              style={{ "--reveal-delay": `${i * 100}ms` } as CSSProperties}
            >
              <Link
                href={card.href}
                data-spotlight=""
                className="imt-glow-border group flex h-full flex-col overflow-hidden sm:flex-row lg:flex-col"
              >
                <div className="relative aspect-[16/10] shrink-0 overflow-hidden sm:aspect-auto sm:min-h-52 sm:w-[42%] lg:aspect-[4/3] lg:min-h-0 lg:w-auto">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    placeholder="blur"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 42vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [mask-image:linear-gradient(to_bottom,#000_55%,transparent)] group-hover:scale-105 motion-reduce:group-hover:scale-100 sm:[mask-image:linear-gradient(to_right,#000_60%,transparent)] lg:[mask-image:linear-gradient(to_bottom,#000_55%,transparent)]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5 sm:justify-center sm:p-7 lg:justify-end">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-imt-mono text-xs uppercase tracking-[0.2em] text-imt-accent">{card.eyebrow}</p>
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-imt-border text-imt-accent transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45 group-hover:border-imt-accent group-hover:bg-imt-accent group-hover:text-imt-bg motion-reduce:group-hover:rotate-0">
                      <ArrowUpRight className="size-5" aria-hidden />
                    </span>
                  </div>
                  <h3 className="mt-3 text-balance text-xl font-bold leading-tight sm:text-2xl xl:text-[1.75rem]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-pretty text-[15px] leading-relaxed text-imt-muted sm:text-base">{card.text}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
