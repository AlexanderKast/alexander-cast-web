import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { formatCop, PLAN_CONDITIONS, PLAN_INCLUDES, PLANS } from "@/content/imt";
import { N_CUPOS } from "@/site.config";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/imt/ui/Button";
import { Card } from "@/components/imt/ui/Card";
import { GlowBorder } from "@/components/imt/ui/GlowBorder";
import { Section, SectionHeader } from "@/components/imt/ui/Section";

export function Plans() {
  return (
    <Section id="planes" labelledBy="planes-title">
      <SectionHeader
        id="planes-title"
        eyebrow="Inversión"
        title="Un equipo de desarrollo completo por menos que un empleado."
        intro="Un desarrollador en nómina supera los $7.000.000 al mes. Una casa de software cobra desde $30.000.000 por proyecto, y tarda meses."
      />

      <div
        data-reveal=""
        className="mt-10 flex flex-col items-start gap-2 rounded-2xl border border-imt-cyan bg-imt-bg px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="font-imt-mono text-sm uppercase tracking-[0.18em] text-imt-cyan">
          Cupos fundadores ·{" "}
          <span className="text-imt-text">
            {N_CUPOS === null ? "Cupos limitados este trimestre" : `${N_CUPOS} disponibles este trimestre`}
          </span>
        </p>
        <Link
          href="/diagnostico"
          className="text-sm font-semibold text-imt-text underline-offset-4 transition-colors hover:text-imt-cyan hover:underline"
        >
          Aplica con el diagnóstico →
        </Link>
      </div>

      <ul className="mt-8 grid gap-4 lg:grid-cols-3 lg:items-stretch">
        {PLANS.map((plan, i) => (
          <GlowBorder
            key={plan.id}
            as="li"
            reveal
            delay={i * 100}
            active={plan.featured}
            className={cn("flex flex-col p-7 sm:p-8", plan.featured && "lg:-my-3 lg:py-11")}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-imt-mono text-base font-medium tracking-[0.2em] text-imt-text">{plan.name}</h3>
              {plan.featured ? (
                <span className="rounded-full bg-imt-cyan px-3 py-1 font-imt-mono text-[11px] font-medium uppercase tracking-[0.14em] text-imt-bg">
                  Más elegido
                </span>
              ) : null}
            </div>

            <p className="mt-6 text-sm text-imt-muted">desde</p>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-imt-display text-4xl font-bold tracking-tight text-imt-text sm:text-[2.75rem]">
                {formatCop(plan.priceCop)}
              </span>
              <span className="text-imt-muted">/mes · COP</span>
            </p>

            <ul className="mt-6 space-y-2 border-t border-imt-border pt-6">
              {[plan.hours, plan.projects].map((line) => (
                <li key={line} className="flex items-center gap-2.5 text-imt-text">
                  <Check className="size-4 shrink-0 text-imt-cyan" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-5 flex-1 text-pretty leading-relaxed text-imt-muted">{plan.description}</p>

            <Link
              href={`/diagnostico?plan=${plan.id}`}
              className={buttonClasses(plan.featured ? "primary" : "secondary", "md", "mt-8 w-full")}
              aria-label={`Agenda tu diagnóstico — plan ${plan.name}`}
            >
              Agenda tu diagnóstico
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </GlowBorder>
        ))}
      </ul>

      <Card reveal className="mt-8">
        <h3 className="text-xl font-bold">Todos los planes incluyen</h3>
        <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {PLAN_INCLUDES.map((item) => (
            <li key={item} className="flex items-start gap-3 text-imt-text">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-imt-cyan text-imt-bg">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <ul data-reveal="" className="mt-6 flex flex-col gap-1.5 text-sm text-imt-muted sm:flex-row sm:flex-wrap sm:gap-x-5">
        {PLAN_CONDITIONS.map((condition) => (
          <li key={condition} className="flex gap-2">
            <span aria-hidden="true" className="text-imt-cyan">·</span>
            {condition}
          </li>
        ))}
      </ul>
    </Section>
  );
}
