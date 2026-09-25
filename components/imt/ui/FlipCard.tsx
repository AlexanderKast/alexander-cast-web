"use client";

import { useState, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Card that flips to show an example. Click / tap / Enter / Space toggles it
 * (hover only hints depth, never flips). Both faces share one grid cell, so
 * the card is always as tall as its longer face and the back text can never
 * overflow on small screens.
 */
export function FlipCard({
  front,
  back,
  label,
  className,
  featured = false,
}: {
  front: ReactNode;
  back: ReactNode;
  /** Short name of the card, used in the button label. */
  label: string;
  className?: string;
  featured?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={cn("imt-flip h-full", className)} data-flipped={flipped}>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        aria-label={`${label}: ${flipped ? "ocultar ejemplo" : "ver ejemplo"}`}
        className="imt-flip-inner group grid h-full min-h-[200px] w-full rounded-[24px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-imt-accent sm:min-h-[220px]"
      >
        <span
          className="imt-flip-face imt-glow-border flex h-full flex-col p-6 [grid-area:1/1] sm:p-8"
          data-active={featured ? "true" : undefined}
          aria-hidden={flipped}
        >
          {front}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-medium text-imt-accent">
            <RotateCw
              className="size-3.5 transition-transform duration-500 group-hover:rotate-90 motion-reduce:transition-none"
              aria-hidden
            />
            Ver ejemplo
          </span>
        </span>
        <span
          className="imt-flip-face imt-flip-back flex h-full flex-col justify-center rounded-[24px] bg-imt-accent p-6 text-imt-bg [grid-area:1/1] sm:p-8"
          aria-hidden={!flipped}
        >
          <span className="text-pretty break-words font-imt-display text-base font-bold leading-snug sm:text-xl">
            {back}
          </span>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold">
            <RotateCw className="size-3.5" aria-hidden />
            Volver
          </span>
        </span>
      </button>
    </div>
  );
}
