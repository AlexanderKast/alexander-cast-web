import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";

type SectionProps = {
  id?: string;
  className?: string;
  containerClassName?: string;
  /** Id of the heading that names the section (aria-labelledby). */
  labelledBy?: string;
  children: ReactNode;
};

export function Section({ id, className, containerClassName, labelledBy, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("relative py-20 sm:py-28", className)}>
      <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", containerClassName)}>
        {children}
      </div>
    </section>
  );
}

type SectionHeaderProps = {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({ id, eyebrow, title, intro, align = "left", className }: SectionHeaderProps) {
  return (
    <header data-reveal="" className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="mt-4 text-balance text-3xl font-bold leading-[1.1] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {intro ? (
        <p className="mt-5 text-pretty text-base leading-relaxed text-imt-muted sm:text-lg">{intro}</p>
      ) : null}
    </header>
  );
}
