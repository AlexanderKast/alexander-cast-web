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
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors duration-300 hover:border-imt-accent hover:text-imt-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-imt-accent",
          open ? "border-imt-accent bg-imt-accent/10 text-imt-accent" : "border-imt-border bg-imt-bg/80 text-imt-text",
        )}
      >
        ¿Qué recibes?
        <ChevronDown className={cn("size-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", open && "rotate-180")} aria-hidden />
      </button>
      <div id={panelId} className="imt-collapse" data-open={open}>
        <div inert={!open}>
          <ul className="space-y-2.5 pt-5">
            {items.map((item, i) => (
              <li
                key={item}
                className={cn(
                  "flex items-start gap-3 text-base text-imt-text transition-[opacity,translate] duration-500 ease-out motion-reduce:translate-x-0 sm:text-lg",
                  open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0",
                )}
                style={{ transitionDelay: open ? `${120 + i * 90}ms` : "0ms" } as CSSProperties}
              >
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-imt-accent text-imt-bg">
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
