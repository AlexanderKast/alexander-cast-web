import { Check } from "lucide-react";
import { PLAN_CONDITIONS, PLAN_INCLUDES } from "@/content/imt";
import { N_CUPOS } from "@/site.config";
import { PlansGrid } from "./PlansGrid";

/** Founder-slots band + the three plans + what every plan includes. */
export function Plans() {
  return (
    <section aria-labelledby="planes-grid-title" className="relative pb-16 sm:pb-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="planes-grid-title" className="sr-only">
          Planes mensuales
        </h2>

        <div
          data-reveal=""
          className="flex flex-col items-start gap-3 rounded-2xl border border-imt-accent bg-imt-bg/90 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-imt-mono text-xs uppercase tracking-[0.16em] text-imt-accent sm:text-sm sm:tracking-[0.18em]">
            <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-imt-accent motion-reduce:animate-none" />
            Cupos fundadores ·{" "}
            <span className="text-imt-text">
              {N_CUPOS === null ? "Cupos limitados este trimestre" : `${N_CUPOS} disponibles este trimestre`}
            </span>
          </p>
        </div>

        <PlansGrid />

        <div data-reveal="" className="mt-10 grid gap-8 rounded-3xl border border-imt-border bg-imt-surface p-6 sm:rounded-[2rem] sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h3 className="text-2xl font-bold sm:text-3xl">Todos los planes incluyen</h3>
            <ul className="mt-6 space-y-2 text-sm text-imt-muted">
              {PLAN_CONDITIONS.map((condition) => (
                <li key={condition} className="flex gap-2">
                  <span aria-hidden="true" className="text-imt-accent">
                    ·
                  </span>
                  {condition}
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {PLAN_INCLUDES.map((item) => (
              <li key={item} className="group flex items-start gap-3 text-imt-text">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-imt-accent text-imt-bg transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
