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
function useTween(value: number, ms = 450) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / ms, 1);
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
    <span className={cn("font-imt-display text-5xl font-bold tracking-tight tabular-nums", featured ? "text-imt-accent" : "text-imt-text")}>
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
    cardRefs.current[recommended]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [recommended]);

  return (
    <>
      {/* Plan finder */}
      <div
        data-reveal=""
        className="mt-8 grid gap-6 rounded-[2rem] border border-imt-border bg-imt-bg/90 p-6 backdrop-blur sm:p-8 lg:grid-cols-[1fr_auto_auto] lg:items-end"
      >
        <div>
          <p className="flex items-center gap-2 font-imt-display text-2xl font-bold">
            <Sparkles className="size-5 text-imt-accent" aria-hidden />
            ¿Qué plan te sirve?
          </p>
          <p className="mt-1 text-imt-muted">Responde dos preguntas y te lo marcamos.</p>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm text-imt-muted">¿Cuántos frentes quieres mover a la vez?</legend>
          <div className="imt-segment">
            {FRONTS.map((f) => (
              <button key={f.value} type="button" aria-pressed={fronts === f.value} onClick={() => setFronts(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm text-imt-muted">¿Necesitas software a la medida?</legend>
          <div className="imt-segment">
            <button type="button" aria-pressed={ownProduct === false} onClick={() => setOwnProduct(false)}>
              No
            </button>
            <button type="button" aria-pressed={ownProduct === true} onClick={() => setOwnProduct(true)}>
              Sí
            </button>
          </div>
        </fieldset>
        <p className="min-h-6 lg:col-span-3" role="status" aria-live="polite">
          {recommended ? (
            <span className="text-imt-text">
              Te recomendamos <strong className="text-imt-accent">{PLANS.find((p) => p.id === recommended)?.name}</strong>. Lo
              confirmamos en el diagnóstico.
            </span>
          ) : null}
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <div className="imt-segment" role="group" aria-label="Forma de pago">
          <button type="button" aria-pressed={billing === "mensual"} onClick={() => setBilling("mensual")}>
            Mensual
          </button>
          <button type="button" aria-pressed={billing === "anual"} onClick={() => setBilling("anual")}>
            Anual · 2 meses gratis
          </button>
        </div>
        <p className="text-sm text-imt-muted">
          {billing === "anual" ? "Pagas 10 meses y recibes 12. Precio equivalente por mes." : "Contrato mínimo de 3 meses."}
        </p>
      </div>

      <ul className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-stretch">
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
                  "imt-glow-border flex h-full scroll-mt-28 flex-col p-8 sm:p-10",
                  plan.featured && "lg:py-14",
                  isRecommended && "ring-2 ring-imt-accent ring-offset-4 ring-offset-imt-bg",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-imt-mono text-lg font-medium tracking-[0.22em] text-imt-text">{plan.name}</h3>
                  {isRecommended ? (
                    <span className="rounded-full bg-imt-text px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-imt-bg">
                      Para ti
                    </span>
                  ) : plan.featured ? (
                    <span className="rounded-full bg-imt-accent px-3 py-1 font-imt-mono text-[11px] font-medium uppercase tracking-[0.14em] text-imt-bg">
                      Más elegido
                    </span>
                  ) : null}
                </div>

                <p className="mt-8 text-sm text-imt-muted">desde</p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <Price value={effectivePrice(plan.priceCop, billing)} featured={plan.featured} />
                  <span className="text-imt-muted">/mes · COP</span>
                </p>
                {billing === "anual" ? (
                  <p className="mt-1 text-xs text-imt-muted line-through">{formatCop(plan.priceCop)}/mes</p>
                ) : null}

                <ul className="mt-8 space-y-3 border-t border-imt-border pt-8">
                  {[plan.hours, plan.projects].map((line) => (
                    <li key={line} className="flex items-center gap-3 text-lg text-imt-text">
                      <Check className="size-5 shrink-0 text-imt-accent" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 flex-1 text-pretty leading-relaxed text-imt-muted">{plan.description}</p>

                <Link
                  href={diagnosticoHref(plan.id)}
                  className={buttonClasses(plan.featured || isRecommended ? "primary" : "secondary", "lg", "mt-10 w-full")}
                  aria-label={`Agenda tu diagnóstico — plan ${plan.name}`}
                >
                  Agenda tu diagnóstico
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
