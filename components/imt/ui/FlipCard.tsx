"use client";

import { useState, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Card that flips to show an example. Click / tap / Enter toggles it; on
 * desktop (hover-capable pointers) it also flips while hovered.
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
    <div className={cn("imt-flip", className)} data-flipped={flipped}>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        aria-label={`${label}: ${flipped ? "ocultar ejemplo" : "ver ejemplo"}`}
        className="imt-flip-inner relative block h-full min-h-[220px] w-full text-left"
      >
        <span
          className="imt-flip-face imt-glow-border flex h-full flex-col p-7 sm:p-8"
          data-active={featured ? "true" : undefined}
          aria-hidden={flipped}
        >
          {front}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-medium text-imt-accent">
            <RotateCw className="size-3.5" aria-hidden />
            Ver ejemplo
          </span>
        </span>
        <span
          className="imt-flip-face imt-flip-back absolute inset-0 flex flex-col justify-center rounded-[24px] bg-imt-accent p-7 text-imt-bg sm:p-8"
          aria-hidden={!flipped}
        >
          <span className="text-pretty font-imt-display text-lg font-bold leading-snug sm:text-xl">{back}</span>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold">
            <RotateCw className="size-3.5" aria-hidden />
            Volver
          </span>
        </span>
      </button>
    </div>
  );
}
