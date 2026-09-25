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
    <section aria-labelledby="cierre-title" className="relative py-16 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          data-reveal=""
          data-spotlight=""
          className="relative overflow-hidden rounded-[2rem] border border-imt-border bg-imt-bg/90 px-5 py-14 text-center sm:rounded-[2.5rem] sm:px-12 sm:py-24 sm:backdrop-blur"
        >
          <div aria-hidden="true" className="imt-dots absolute inset-0 opacity-60" />
          {/* Hairline of light along the top edge and a soft glow under the headline. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.7),transparent)]"
          />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-48 w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(163,230,53,0.12),transparent)] sm:h-64"
          />
          <p className="relative font-imt-mono text-xs uppercase tracking-[0.24em] text-imt-muted">De operar a escalar</p>
          <h2
            id="cierre-title"
            className="relative mx-auto mt-4 max-w-4xl text-balance text-[2rem] font-bold leading-[1.08] sm:mt-5 sm:text-6xl sm:leading-[1.05]"
          >
            Tu empresa ya vende. <span className="imt-text-glow">Ahora necesita sistemas que crezcan con ella.</span>
          </h2>
          {next ? (
            <Link
              href={next.href}
              className="group relative mt-8 inline-flex min-h-12 items-center gap-3 rounded-full border border-imt-border bg-imt-surface py-2 pl-6 pr-2 font-medium text-imt-text transition-colors duration-300 hover:border-imt-accent hover:text-imt-accent sm:mt-10"
            >
              {next.label}
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-imt-accent text-imt-bg transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45 motion-reduce:group-hover:rotate-0">
                <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
