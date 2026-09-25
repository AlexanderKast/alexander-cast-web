import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

// Staggered entrance shared by the header lines (softer, no slide, on reduced motion).
const ENTER =
  "animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:slide-in-from-bottom-0";

/** Page-level header with the page's single H1. */
export function PageHeader({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate mx-auto w-full max-w-7xl px-4 pb-8 pt-28 sm:px-6 sm:pb-10 sm:pt-40 lg:px-8">
      {/* Decorative backdrop: dotted grid + a soft accent glow on the right. */}
      <div aria-hidden="true" className="imt-dots pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-24 -z-10 size-56 rounded-full bg-imt-accent/10 blur-3xl sm:right-[8%] sm:size-80"
      />

      <div className={ENTER}>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h1
        id={id}
        className={`mt-5 max-w-5xl text-balance break-words text-[2.5rem] font-bold leading-[0.98] tracking-[-0.035em] sm:text-6xl sm:leading-[0.95] lg:text-7xl ${ENTER} delay-100`}
      >
        {title}
      </h1>
      <span
        aria-hidden="true"
        className={`mt-6 block h-px w-24 origin-left bg-gradient-to-r from-imt-accent to-transparent sm:mt-8 sm:w-40 ${ENTER} delay-200`}
      />
      {intro ? (
        <p
          className={`mt-5 max-w-2xl text-pretty text-base leading-relaxed text-imt-muted sm:mt-6 sm:text-xl ${ENTER} delay-300`}
        >
          {intro}
        </p>
      ) : null}
      {children}
    </header>
  );
}
