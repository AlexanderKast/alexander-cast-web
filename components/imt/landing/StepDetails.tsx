"use client";

import { useId, useState, type CSSProperties } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** "¿Qué recibes?" toggle under each step, with staggered items. */
export function StepDetails({ items }: { items: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-7">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-imt-border bg-imt-bg/80 px-4 py-2.5 text-sm font-semibold text-imt-text transition-colors hover:border-imt-accent hover:text-imt-accent"
      >
        ¿Qué recibes?
        <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} aria-hidden />
      </button>
      <div id={panelId} className="imt-collapse" data-open={open}>
        <div inert={!open}>
          <ul className="space-y-2.5 pt-5">
            {items.map((item, i) => (
              <li
                key={item}
                className={cn(
                  "flex items-center gap-3 text-lg text-imt-text transition-all duration-500",
                  open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0",
                )}
                style={{ transitionDelay: open ? `${120 + i * 90}ms` : "0ms" } as CSSProperties}
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-imt-accent text-imt-bg">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
