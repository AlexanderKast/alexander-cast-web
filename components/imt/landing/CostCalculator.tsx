"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { diagnosticoHref, formatCop, PLANS } from "@/content/imt";
import { buttonClasses } from "@/components/imt/ui/Button";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";

const WEEKS_PER_MONTH = 4.33;
const entryPrice = Math.min(...PLANS.map((p) => p.priceCop));

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-imt-text">
          {label}
        </label>
        <output htmlFor={id} className="font-imt-display text-2xl font-bold text-imt-accent tabular-nums">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="imt-range mt-4"
      />
    </div>
  );
}

/**
 * Interactive estimate of what manual, repetitive work costs per month,
 * using only the visitor's own numbers. No savings are promised.
 */
export function CostCalculator() {
  const [people, setPeople] = useState(3);
  const [hours, setHours] = useState(8);
  const [hourCost, setHourCost] = useState(20_000);

  const monthlyHours = Math.round(people * hours * WEEKS_PER_MONTH);
  const monthlyCost = Math.round(monthlyHours * hourCost);

  return (
    <section aria-labelledby="calculadora-title" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <header data-reveal="">
            <Eyebrow>Haz la cuenta</Eyebrow>
            <h2 id="calculadora-title" className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
              ¿Cuánto te cuesta operar a mano?
            </h2>
            <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-imt-muted">
              Mueve los valores con los datos de tu empresa y mira cuánto tiempo y dinero se va cada mes en tareas que
              un sistema podría hacer.
            </p>
          </header>

          <div data-reveal="" data-spotlight="" className="imt-card overflow-hidden">
            <div className="space-y-8 p-6 sm:p-10">
              <Slider
                label="Personas haciendo tareas repetitivas"
                value={people}
                min={1}
                max={30}
                step={1}
                format={(v) => `${v}`}
                onChange={setPeople}
              />
              <Slider
                label="Horas por persona a la semana"
                value={hours}
                min={1}
                max={40}
                step={1}
                format={(v) => `${v} h`}
                onChange={setHours}
              />
              <Slider
                label="Costo por hora (COP)"
                value={hourCost}
                min={8_000}
                max={120_000}
                step={1_000}
                format={formatCop}
                onChange={setHourCost}
              />
            </div>

            <div className="grid border-t border-imt-border sm:grid-cols-2" aria-live="polite">
              <div className="border-b border-imt-border p-6 sm:border-b-0 sm:border-r sm:p-8">
                <p className="text-sm text-imt-muted">Horas al mes en tareas repetitivas</p>
                <p className="mt-2 font-imt-display text-5xl font-bold text-imt-text tabular-nums">{monthlyHours} h</p>
              </div>
              <div className="bg-imt-bg p-6 sm:p-8">
                <p className="text-sm text-imt-muted">Lo que te cuesta cada mes</p>
                <p className="mt-2 font-imt-display text-5xl font-bold text-imt-accent tabular-nums">{formatCop(monthlyCost)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-imt-border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <p className="text-sm text-imt-muted">
                Los planes arrancan desde <span className="font-semibold text-imt-text">{formatCop(entryPrice)}/mes</span>.
                <br className="hidden sm:block" /> Cálculo de referencia con tus números, no una promesa de ahorro.
              </p>
              <Link href={diagnosticoHref()} className={buttonClasses("primary", "md", "shrink-0")}>
                Revisar mi caso
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
