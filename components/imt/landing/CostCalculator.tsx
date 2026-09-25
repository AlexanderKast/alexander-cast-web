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
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium leading-snug text-imt-text">
          {label}
        </label>
        <output htmlFor={id} className="shrink-0 font-imt-display text-xl font-bold text-imt-accent tabular-nums sm:text-2xl">
          {format(value)}
        </output>
      </div>
      {/* 44px tall hit area; the visible 6px track (filled up to the thumb) is painted in the middle. */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="imt-range mt-1 h-11"
        style={{
          background: `linear-gradient(var(--accent), var(--accent)) left center / ${pct}% 6px no-repeat, linear-gradient(var(--border-solid), var(--border-solid)) center / 100% 6px no-repeat`,
        }}
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
    <section aria-labelledby="calculadora-title" className="relative py-16 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <header data-reveal="">
            <Eyebrow>Haz la cuenta</Eyebrow>
            <h2 id="calculadora-title" className="mt-4 text-balance text-[2rem] font-bold leading-[1.05] sm:text-5xl">
              ¿Cuánto te cuesta operar a mano?
            </h2>
            <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-imt-muted sm:mt-5 sm:text-lg">
              Mueve los valores con los datos de tu empresa y mira cuánto tiempo y dinero se va cada mes en tareas que
              un sistema podría hacer.
            </p>
          </header>

          <div data-reveal="" data-spotlight="" className="imt-card overflow-hidden">
            <div className="space-y-5 p-5 sm:space-y-7 sm:p-10">
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

            {/* Stacked rows (not two columns): the cost can reach 12 digits and must never overflow its cell. */}
            <div className="border-t border-imt-border" aria-live="polite">
              <div className="flex items-baseline justify-between gap-4 border-b border-imt-border px-5 py-4 sm:px-8 sm:py-5">
                <p className="text-sm text-imt-muted">Horas al mes en tareas repetitivas</p>
                <p className="shrink-0 font-imt-display text-2xl font-bold text-imt-text tabular-nums sm:text-3xl">
                  {monthlyHours} h
                </p>
              </div>
              <div className="bg-imt-bg px-5 py-5 sm:px-8 sm:py-7">
                <p className="text-sm text-imt-muted">Lo que te cuesta cada mes</p>
                <p className="mt-1.5 min-w-0 break-words font-imt-display text-[2.25rem] font-bold leading-none text-imt-accent tabular-nums sm:mt-2 sm:text-5xl">
                  {formatCop(monthlyCost)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-imt-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
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
