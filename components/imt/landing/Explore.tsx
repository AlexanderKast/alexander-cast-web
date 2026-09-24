import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatCop, PLANS } from "@/content/imt";
import { cn } from "@/lib/utils";
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
    className: "lg:col-span-7 lg:row-span-2",
    imageClass: "aspect-[4/3] lg:aspect-auto lg:h-[420px]",
  },
  {
    href: "/planes",
    eyebrow: "02 · Planes",
    title: `Desde ${formatCop(lowestPrice)} al mes.`,
    text: "Un equipo de desarrollo completo por menos que un empleado.",
    image: operamosImage,
    alt: "Tablero de monitoreo con gráficas en vivo",
    className: "lg:col-span-5",
    imageClass: "aspect-[16/9]",
  },
  {
    href: "/nosotros",
    eyebrow: "03 · Equipo",
    title: "Estrategia y código en la misma mesa.",
    text: "Alexander y Samuel Castaño, sin intermediarios.",
    image: estudioImage,
    alt: "Estudio de desarrollo de noche con dos monitores y un tablero de estrategia",
    className: "lg:col-span-5",
    imageClass: "aspect-[16/9]",
  },
];

export function Explore() {
  return (
    <section aria-labelledby="explora-title" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header data-reveal="">
          <Eyebrow>Qué hacemos</Eyebrow>
          <h2 id="explora-title" className="mt-4 max-w-2xl text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
            Nos convertimos en tu equipo de desarrollo.
          </h2>
        </header>

        <ul className="mt-12 grid gap-5 lg:grid-cols-12">
          {CARDS.map((card, i) => (
            <li
              key={card.href}
              data-reveal=""
              data-tilt=""
              style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}
              className={cn(card.className, "transition-transform duration-300 ease-out")}
            >
              <Link
                href={card.href}
                data-spotlight=""
                className="imt-glow-border group flex h-full flex-col overflow-hidden"
              >
                <div className={cn("relative overflow-hidden", card.imageClass)}>
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    placeholder="blur"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                  />
                </div>
                <div className="flex flex-1 items-end justify-between gap-6 p-6 sm:p-8">
                  <div>
                    <p className="font-imt-mono text-xs uppercase tracking-[0.2em] text-imt-accent">{card.eyebrow}</p>
                    <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{card.title}</h3>
                    <p className="mt-2 text-imt-muted">{card.text}</p>
                  </div>
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-imt-border text-imt-accent transition-colors group-hover:border-imt-accent group-hover:bg-imt-accent group-hover:text-imt-bg">
                    <ArrowUpRight className="size-5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
