"use client";

import { useId, useRef, useState } from "react";
import { Briefcase, CodeXml } from "lucide-react";
import { TWO_VIEWS } from "@/content/imt";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";

/**
 * "Dos miradas": pick a common problem and see how strategy (Alexander) and
 * code (Samuel) approach it. Tabs follow the WAI-ARIA tabs pattern (all four
 * arrow keys, Home/End). On phones the tabs become a horizontal snap strip;
 * from lg up they stack next to the panel.
 */
export function TwoViews() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = TWO_VIEWS[active];

  const select = (index: number, focus = false) => {
    setActive(index);
    const tab = tabs.current[index];
    if (!tab) return;
    if (focus) tab.focus({ preventScroll: true });
    // Keep the chosen tab visible inside the mobile strip without moving the page.
    const strip = tab.parentElement;
    if (strip && strip.scrollWidth > strip.clientWidth) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      strip.scrollTo({ left: tab.offsetLeft - strip.offsetLeft - 16, behavior: smooth ? "smooth" : "auto" });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = TWO_VIEWS.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? (active === last ? 0 : active + 1)
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (active === 0 ? last : active - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    select(next, true);
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

        <div data-reveal="" className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div
            role="tablist"
            aria-label="Problemas"
            className={cn(
              "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "sm:-mx-6 sm:scroll-px-6 sm:px-6",
              "lg:mx-0 lg:snap-none lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0",
            )}
          >
            {TWO_VIEWS.map((item, i) => (
              <button
                key={item.problem}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                id={`${baseId}-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={active === i}
                aria-controls={`${baseId}-panel`}
                tabIndex={active === i ? 0 : -1}
                onClick={() => select(i)}
                onKeyDown={onKeyDown}
                className={cn(
                  "min-h-11 w-[78%] max-w-xs shrink-0 snap-start rounded-2xl border px-5 py-4 text-left font-imt-display text-base font-bold",
                  "transition-[background-color,border-color,color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-imt-accent",
                  "sm:w-auto sm:max-w-sm sm:text-lg lg:w-full lg:max-w-none",
                  active === i
                    ? "border-imt-accent bg-imt-accent text-imt-bg shadow-[0_20px_50px_-20px_rgba(163,230,53,0.7)] lg:translate-x-2"
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
            tabIndex={0}
            aria-labelledby={`${baseId}-tab-${active}`}
            className="grid gap-4 rounded-[24px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-imt-accent sm:grid-cols-2"
          >
            {[
              { who: "Alexander · negocio", Icon: Briefcase, text: view.negocio },
              { who: "Samuel · código", Icon: CodeXml, text: view.codigo },
            ].map(({ who, Icon, text }, i) => (
              <article
                key={`${active}-${who}`}
                data-spotlight=""
                className="imt-card animate-in p-6 fade-in slide-in-from-bottom-3 motion-reduce:slide-in-from-bottom-0 sm:p-8"
                style={{
                  animationDelay: `${i * 140}ms`,
                  animationDuration: "650ms",
                  animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  animationFillMode: "both",
                }}
              >
                <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-imt-accent text-imt-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-imt-mono text-sm uppercase tracking-[0.16em] text-imt-accent">{who}</h3>
                <p className="mt-3 text-pretty text-base leading-relaxed text-imt-text sm:text-lg">{text}</p>
              </article>
            ))}
          </div>
        </div>
        <p className="mt-4 flex justify-center gap-2 lg:hidden" aria-hidden="true">
          {TWO_VIEWS.map((item, i) => (
            <span
              key={item.problem}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                active === i ? "w-6 bg-imt-accent" : "w-1.5 bg-imt-border-solid",
              )}
            />
          ))}
        </p>
      </div>
    </section>
  );
}
