"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { question: string; answer: string };

/**
 * Accessible accordion (WAI-ARIA pattern): buttons with aria-expanded /
 * aria-controls, regions labelled by their button, Arrow/Home/End to move
 * between headers. Height animates with grid rows, so long answers never
 * clip; closed panels are `inert` so AT and Tab skip them.
 */
export function FaqAccordion({ items }: { items: readonly Item[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const target =
      e.key === "ArrowDown" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowUp" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (target === null) return;
    e.preventDefault();
    buttons.current[target]?.focus();
  };

  return (
    <div className="divide-y divide-imt-border border-y border-imt-border">
      {items.map((item, i) => {
        const isOpen = open === i;
        const buttonId = `${baseId}-q${i}`;
        const panelId = `${baseId}-a${i}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className="flex w-full items-center justify-between gap-6 py-6 text-left font-imt-display text-lg font-medium text-imt-text transition-colors hover:text-imt-cyan sm:text-xl"
              >
                {item.question}
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-imt-border text-imt-cyan transition-transform duration-200 motion-reduce:transition-none",
                    isOpen && "rotate-45 border-imt-cyan",
                  )}
                  aria-hidden="true"
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} className="imt-collapse" data-open={isOpen}>
              <div inert={!isOpen}>
                <p className="max-w-3xl pb-6 pr-12 text-pretty leading-relaxed text-imt-muted">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
