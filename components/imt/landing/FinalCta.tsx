import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Next = { href: string; label: string };

/**
 * Closing statement shared by the public pages. It does not repeat the
 * form CTA (the header and each page already have it); it points to the
 * next page worth seeing.
 */
export function FinalCta({ next }: { next?: Next }) {
  return (
    <section aria-labelledby="cierre-title" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          data-reveal=""
          data-spotlight=""
          className="relative overflow-hidden rounded-[2.5rem] border border-imt-border bg-imt-bg/90 px-6 py-16 text-center backdrop-blur sm:px-12 sm:py-24"
        >
          <div aria-hidden="true" className="imt-dots absolute inset-0 opacity-60" />
          <p className="relative text-sm text-imt-muted">De operar a escalar</p>
          <h2
            id="cierre-title"
            className="relative mx-auto mt-5 max-w-4xl text-balance text-4xl font-bold leading-[1.05] sm:text-6xl"
          >
            Tu empresa ya vende. <span className="imt-text-glow">Ahora necesita sistemas que crezcan con ella.</span>
          </h2>
          {next ? (
            <Link
              href={next.href}
              className="group relative mt-10 inline-flex items-center gap-3 rounded-full border border-imt-border bg-imt-surface px-6 py-3.5 font-medium text-imt-text transition-colors hover:border-imt-accent hover:text-imt-accent"
            >
              {next.label}
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-imt-accent text-imt-bg transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
