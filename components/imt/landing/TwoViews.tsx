"use client";

import { useId, useState } from "react";
import { Briefcase, CodeXml } from "lucide-react";
import { TWO_VIEWS } from "@/content/imt";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";

/**
 * "Dos miradas": pick a common problem and see how strategy (Alexander) and
 * code (Samuel) approach it. Tabs follow the WAI-ARIA tabs pattern.
 */
export function TwoViews() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const view = TWO_VIEWS[active];

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = TWO_VIEWS.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? (active === last ? 0 : active + 1)
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (active === 0 ? last : active - 1)
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  return (
    <section aria-labelledby="miradas-title" className="relative py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header data-reveal="">
          <Eyebrow>Dos miradas</Eyebrow>
          <h2 id="miradas-title" className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
            Elige un problema y mira cómo lo resolvemos.
          </h2>
        </header>

        <div data-reveal="" className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div role="tablist" aria-label="Problemas" aria-orientation="vertical" className="flex flex-col gap-3">
            {TWO_VIEWS.map((item, i) => (
              <button
                key={item.problem}
                id={`${baseId}-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={active === i}
                aria-controls={`${baseId}-panel`}
                tabIndex={active === i ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={onKeyDown}
                className={cn(
                  "rounded-2xl border px-5 py-4 text-left font-imt-display text-lg font-bold transition-all duration-300",
                  active === i
                    ? "border-imt-accent bg-imt-accent text-imt-bg shadow-[0_20px_50px_-20px_rgba(163,230,53,0.7)]"
                    : "border-imt-border bg-imt-bg/80 text-imt-text hover:border-imt-accent",
                )}
              >
                “{item.problem}”
              </button>
            ))}
          </div>

          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${active}`}
            className="grid gap-4 sm:grid-cols-2"
          >
            {[
              { who: "Alexander · negocio", Icon: Briefcase, text: view.negocio },
              { who: "Samuel · código", Icon: CodeXml, text: view.codigo },
            ].map(({ who, Icon, text }, i) => (
              <article
                key={`${active}-${who}`}
                data-spotlight=""
                className="imt-card animate-in fade-in slide-in-from-bottom-3 p-7 duration-500 sm:p-8"
                style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
              >
                <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-imt-accent text-imt-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-imt-mono text-sm uppercase tracking-[0.16em] text-imt-accent">{who}</h3>
                <p className="mt-3 text-pretty text-lg leading-relaxed text-imt-text">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
