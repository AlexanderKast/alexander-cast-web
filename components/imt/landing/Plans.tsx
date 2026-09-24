import { ArrowRight, Check } from "lucide-react";
import { formatCop, PLAN_CONDITIONS, PLAN_INCLUDES, PLANS } from "@/content/imt";
import { diagnosticoWhatsappUrl, N_CUPOS } from "@/site.config";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/imt/ui/Button";
import { GlowBorder } from "@/components/imt/ui/GlowBorder";

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
          <p className="flex items-center gap-3 font-imt-mono text-sm uppercase tracking-[0.18em] text-imt-accent">
            <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-imt-accent motion-reduce:animate-none" />
            Cupos fundadores ·{" "}
            <span className="text-imt-text">
              {N_CUPOS === null ? "Cupos limitados este trimestre" : `${N_CUPOS} disponibles este trimestre`}
            </span>
          </p>
        </div>

        <ul className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan, i) => (
            <GlowBorder
              key={plan.id}
              as="li"
              reveal
              delay={i * 100}
              active={plan.featured}
              className={cn("flex flex-col p-8 sm:p-10", plan.featured && "lg:-my-4 lg:py-14")}
            >
              <div id={plan.id} className="flex scroll-mt-28 items-center justify-between gap-3">
                <h3 className="font-imt-mono text-lg font-medium tracking-[0.22em] text-imt-text">{plan.name}</h3>
                {plan.featured ? (
                  <span className="rounded-full bg-imt-accent px-3 py-1 font-imt-mono text-[11px] font-medium uppercase tracking-[0.14em] text-imt-bg">
                    Más elegido
                  </span>
                ) : null}
              </div>

              <p className="mt-8 text-sm text-imt-muted">desde</p>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className={cn(
                    "font-imt-display text-5xl font-bold tracking-tight",
                    plan.featured ? "text-imt-accent" : "text-imt-text",
                  )}
                >
                  {formatCop(plan.priceCop)}
                </span>
                <span className="text-imt-muted">/mes · COP</span>
              </p>

              <ul className="mt-8 space-y-3 border-t border-imt-border pt-8">
                {[plan.hours, plan.projects].map((line) => (
                  <li key={line} className="flex items-center gap-3 text-lg text-imt-text">
                    <Check className="size-5 shrink-0 text-imt-accent" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex-1 text-pretty leading-relaxed text-imt-muted">{plan.description}</p>

              <a
                href={diagnosticoWhatsappUrl(plan.name)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses(plan.featured ? "primary" : "secondary", "lg", "mt-10 w-full")}
                aria-label={`Agenda tu diagnóstico por WhatsApp — plan ${plan.name}`}
              >
                Agenda tu diagnóstico
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </GlowBorder>
          ))}
        </ul>

        <div data-reveal="" className="mt-10 grid gap-8 rounded-[2rem] border border-imt-border bg-imt-surface p-8 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h3 className="text-3xl font-bold">Todos los planes incluyen</h3>
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
              <li key={item} className="flex items-start gap-3 text-imt-text">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-imt-accent text-imt-bg">
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
