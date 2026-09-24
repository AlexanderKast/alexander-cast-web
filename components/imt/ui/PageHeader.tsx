import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

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
    <header className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-32 sm:px-6 sm:pt-40 lg:px-8">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 id={id} className="mt-5 max-w-5xl text-balance text-5xl font-bold leading-[0.95] tracking-[-0.035em] sm:text-7xl">
        {title}
      </h1>
      {intro ? <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-imt-muted sm:text-xl">{intro}</p> : null}
      {children}
    </header>
  );
}
