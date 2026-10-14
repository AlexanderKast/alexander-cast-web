"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { diagnosticoHref, formatCop, PLANS, type PlanId } from "@/content/imt";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/imt/ui/Button";

type Billing = "mensual" | "anual";

/** Annual plan: pay 10 months, get 12 → effective monthly price. */
function effectivePrice(price: number, billing: Billing) {
  return billing === "anual" ? Math.round((price * 10) / 12 / 1000) * 1000 : price;
}

/** Tweens a number when it changes (price updates). */
function useTween(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    // Reduced motion: a short, soft tween instead of none.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? Math.min(ms, 250) : ms;
    const start = performance.now();
    const a = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(a + (value - a) * eased);
      setShown(current);
      from.current = current;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);
  return shown;
}

function Price({ value, featured }: { value: number; featured: boolean }) {
  const shown = useTween(value);
  return (
    <span
      className={cn(
        "font-imt-display text-4xl font-bold tracking-tight tabular-nums sm:text-5xl",
        featured ? "text-imt-accent" : "text-imt-text",
      )}
    >
      {formatCop(Math.round(shown / 1000) * 1000)}
    </span>
  );
}

const FRONTS = [
  { value: 1, label: "Uno" },
  { value: 2, label: "Dos" },
  { value: 3, label: "Tres o más" },
] as const;

function recommend(fronts: number, ownProduct: boolean): PlanId {
  if (fronts >= 3) return "escala";
  if (fronts === 2) return ownProduct ? "escala" : "acelera";
  return ownProduct ? "acelera" : "automatiza";
}

export function PlansGrid() {
  const [billing, setBilling] = useState<Billing>("mensual");
  const [fronts, setFronts] = useState<number | null>(null);
  const [ownProduct, setOwnProduct] = useState<boolean | null>(null);
  const recommended = fronts !== null && ownProduct !== null ? recommend(fronts, ownProduct) : null;
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    if (!recommended) return;
    const card = cardRefs.current[recommended];
    if (!card) return;
    // Only glide to the card when it is not already fully in view.
    const rect = card.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  }, [recommended]);

  return (
    <>
      {/* Plan finder */}
      <div
        data-reveal=""
        className="mt-8 grid gap-6 rounded-3xl border border-imt-border bg-imt-bg/90 p-5 backdrop-blur sm:rounded-[2rem] sm:p-8 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-end"
      >
        <div className="md:col-span-2 lg:col-span-1">
          <p className="flex items-center gap-2 font-imt-display text-xl font-bold sm:text-2xl">
            <Sparkles className="size-5 text-imt-accent" aria-hidden />
            ¿Qué plan te sirve?
          </p>
          <p className="mt-1 text-imt-muted">Responde dos preguntas y te lo marcamos.</p>
        </div>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm text-imt-muted">¿Cuántos frentes quieres mover a la vez?</legend>
          <div className="imt-segment flex-wrap [&>button]:min-h-11 [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-offset-2 [&>button]:focus-visible:outline-imt-accent">
            {FRONTS.map((f) => (
              <button key={f.value} type="button" aria-pressed={fronts === f.value} onClick={() => setFronts(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm text-imt-muted">¿Necesitas software a la medida?</legend>
          <div className="imt-segment flex-wrap [&>button]:min-h-11 [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-offset-2 [&>button]:focus-visible:outline-imt-accent">
            <button type="button" aria-pressed={ownProduct === false} onClick={() => setOwnProduct(false)}>
              No
            </button>
            <button type="button" aria-pressed={ownProduct === true} onClick={() => setOwnProduct(true)}>
              Sí
            </button>
          </div>
        </fieldset>
        <p className="min-h-6 md:col-span-2 lg:col-span-3" role="status" aria-live="polite">
          {recommended ? (
            <span
              key={recommended}
              className="inline-block animate-in text-imt-text fade-in slide-in-from-bottom-1 duration-500 motion-reduce:slide-in-from-bottom-0"
            >
              Te recomendamos <strong className="text-imt-accent">{PLANS.find((p) => p.id === recommended)?.name}</strong>. Lo
              confirmamos en el diagnóstico.
            </span>
          ) : null}
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <div className={cn("imt-segment flex-wrap [&>button]:min-h-11 [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-offset-2 [&>button]:focus-visible:outline-imt-accent", "justify-center")} role="group" aria-label="Forma de pago">
          <button type="button" aria-pressed={billing === "mensual"} onClick={() => setBilling("mensual")}>
            Mensual
          </button>
          <button type="button" aria-pressed={billing === "anual"} onClick={() => setBilling("anual")}>
            Anual · 2 meses gratis
          </button>
        </div>
        <p key={billing} className="animate-in text-center text-sm text-imt-muted fade-in duration-500">
          {billing === "anual" ? "Pagas 10 meses y recibes 12. Precio equivalente por mes." : "Contrato mínimo de 3 meses."}
        </p>
      </div>

      <ul className="mx-auto mt-10 grid max-w-xl gap-5 lg:max-w-none lg:grid-cols-3 lg:items-stretch">
        {PLANS.map((plan, i) => {
          const isRecommended = recommended === plan.id;
          return (
            <li
              key={plan.id}
              ref={(el) => {
                cardRefs.current[plan.id] = el;
              }}
              data-reveal=""
              data-tilt=""
              style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}
              className={cn("transition-transform duration-300 ease-out", plan.featured && "lg:-my-4")}
            >
              <div
                id={plan.id}
                data-spotlight=""
                data-active={plan.featured || isRecommended ? "true" : undefined}
                className={cn(
                  "imt-glow-border flex h-full scroll-mt-28 flex-col p-6 transition-shadow duration-500 sm:p-10",
                  plan.featured && "lg:py-14",
                  isRecommended && "ring-2 ring-imt-accent ring-offset-4 ring-offset-imt-bg",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-imt-mono text-lg font-medium tracking-[0.22em] text-imt-text">{plan.name}</h3>
                  {isRecommended ? (
                    <span className="animate-in rounded-full bg-imt-text px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-imt-bg zoom-in-90 fade-in duration-500">
                      Para ti
                    </span>
                  ) : plan.featured ? (
                    <span className="rounded-full bg-imt-accent px-3 py-1 font-imt-mono text-[11px] font-medium uppercase tracking-[0.14em] text-imt-bg">
                      Más elegido
                    </span>
                  ) : null}
                </div>

                <p className="mt-6 text-sm text-imt-muted sm:mt-8">desde</p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <Price value={effectivePrice(plan.priceCop, billing)} featured={plan.featured} />
                  <span className="text-imt-muted">/mes · COP</span>
                </p>
                {billing === "anual" ? (
                  <p className="mt-1 animate-in text-xs text-imt-muted fade-in duration-500">
                    <span className="line-through">{formatCop(plan.priceCop)}/mes</span> · Pago anual único de{" "}
                    {formatCop(plan.priceCop * 10)}
                  </p>
                ) : null}

                <ul className="mt-6 space-y-3 border-t border-imt-border pt-6 sm:mt-8 sm:pt-8">
                  {[plan.hours, plan.projects].map((line) => (
                    <li key={line} className="flex items-start gap-3 text-base text-imt-text sm:text-lg">
                      <Check className="mt-1 size-5 shrink-0 text-imt-accent" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 flex-1 text-pretty leading-relaxed text-imt-muted">{plan.description}</p>

                <Link
                  href={`/contratar?plan=${plan.id}&periodo=${billing}`}
                  className={buttonClasses(plan.featured || isRecommended ? "primary" : "secondary", "lg", "mt-8 w-full sm:mt-10")}
                  aria-label={`Contratar plan ${plan.name} ${billing}`}
                >
                  Contratar {billing === "anual" ? "plan anual" : "plan mensual"}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href={diagnosticoHref(plan.id)}
                  className="mt-3 inline-flex min-h-11 items-center justify-center text-sm text-imt-muted underline underline-offset-4 transition-colors hover:text-imt-text"
                  aria-label={`Agenda tu diagnóstico — plan ${plan.name}`}
                >
                  ¿Prefieres hablar antes? Agenda tu diagnóstico
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
