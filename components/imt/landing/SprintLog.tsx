"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* Illustrative content only: no real clients or projects. */
const ENTRIES = [
  { sprint: "04", task: "Diagnóstico de procesos", status: "roadmap aprobado" },
  { sprint: "05", task: "Automatización de cotizaciones", status: "en producción" },
  { sprint: "06", task: "Dashboard de ventas en tiempo real", status: "en producción" },
  { sprint: "07", task: "Integración Shopify → Siigo", status: "en producción" },
  { sprint: "08", task: "Agente de IA para soporte en WhatsApp", status: "en producción" },
] as const;

const STEP_MS = 1500;
const HOLD_MS = 3200;

/**
 * Terminal-style sprint log. Rows reveal one by one ("en construcción" →
 * "✓ …"), then the log restarts. All rows are always rendered so the panel
 * never changes height. Static and complete with reduced motion.
 */
export function SprintLog() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number>(ENTRIES.length);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Starts complete (matches the server HTML) and restarts after a pause.
    let count: number = ENTRIES.length;

    const tick = () => {
      if (!visible || document.hidden) return;
      count = count >= ENTRIES.length ? 0 : count + 1;
      setShown(count);
      timer = setTimeout(tick, count >= ENTRIES.length ? HOLD_MS : STEP_MS);
    };

    const io = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = Boolean(entry?.isIntersecting);
      if (visible && !wasVisible) {
        clearTimeout(timer);
        timer = setTimeout(tick, count >= ENTRIES.length ? HOLD_MS : STEP_MS);
      }
    });
    io.observe(el);

    const onVisibility = () => {
      if (!document.hidden && visible) {
        clearTimeout(timer);
        timer = setTimeout(tick, STEP_MS);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={ref} className="imt-card overflow-hidden shadow-[0_30px_90px_-40px_rgba(163,230,53,0.5)]">
      <div className="flex items-center justify-between border-b border-imt-border px-5 py-3">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#3a5a1f]" />
          <span className="size-2.5 rounded-full bg-[#3a5a1f]" />
          <span className="size-2.5 rounded-full bg-imt-accent" />
        </div>
        <span className="font-imt-mono text-xs text-imt-muted">sprints.log</span>
        <span className="rounded-full border border-imt-border px-2.5 py-1 font-imt-mono text-[10px] uppercase tracking-[0.14em] text-imt-muted">
          Ejemplo ilustrativo
        </span>
      </div>

      <p className="sr-only">
        Ejemplo ilustrativo de un registro de sprints: cada semana una entrega pasa a producción.
      </p>

      <ol className="space-y-1 p-4 font-imt-mono text-[12.5px] leading-relaxed sm:p-5 sm:text-[13px]" aria-hidden="true">
        {ENTRIES.map((entry, i) => {
          const state = i < shown - 1 || (shown === ENTRIES.length && i === shown - 1) ? "done" : i === shown - 1 ? "running" : "idle";
          return (
            <li
              key={entry.sprint}
              className={cn(
                "grid grid-cols-[auto_1fr] gap-x-3 rounded-lg px-2 py-2 transition-opacity duration-300 sm:grid-cols-[auto_1fr_auto]",
                state === "idle" ? "opacity-0" : "opacity-100",
                state === "running" && "bg-imt-elev",
              )}
            >
              <span className="text-imt-muted">Sprint {entry.sprint}</span>
              <span className="text-imt-text">{entry.task}</span>
              <span
                className={cn(
                  "col-start-2 sm:col-start-auto",
                  state === "running" ? "text-imt-muted" : "text-imt-accent",
                )}
              >
                {state === "running" ? "▸ en construcción" : `✓ ${entry.status}`}
              </span>
            </li>
          );
        })}
        <li className="flex items-center gap-2 px-2 pt-3 text-imt-muted">
          <span className="text-imt-accent">$</span> próxima entrega: viernes
          <span className="imt-caret inline-block h-4 w-2 bg-imt-accent" />
        </li>
      </ol>
    </div>
  );
}
