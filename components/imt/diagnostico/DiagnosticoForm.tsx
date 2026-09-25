"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, LoaderCircle, MessageCircle } from "lucide-react";
import { diagnosticoAction, type DiagnosticoState } from "@/app/actions/diagnostico";
import {
  diagnosticoFromFormData,
  diagnosticoSchema,
  EQUIPO_OPTIONS,
  fieldErrorsFrom,
  HERRAMIENTAS_OPTIONS,
  INVERSION_OPTIONS,
  VENTAS_OPTIONS,
  type FieldErrors,
} from "@/lib/imt/diagnostico";
import { isPlanId, PLANS, planName, type PlanId } from "@/content/imt";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/imt/ui/Button";

// Cal.com only loads after a successful submission.
const CalEmbed = dynamic(() => import("@/components/sections/cal-embed").then((m) => m.CalEmbed), {
  ssr: false,
  loading: () => <div className="h-[680px] animate-pulse rounded-2xl border border-imt-border bg-imt-bg" />,
});

const INITIAL: DiagnosticoState = { status: "idle" };

const FIELD_ORDER: (keyof FieldErrors)[] = [
  "nombre",
  "empresa",
  "cargo",
  "whatsapp",
  "email",
  "plan",
  "ventas",
  "equipo",
  "dolor",
  "herramientas",
  "herramientasOtras",
  "inversion",
  "consentimiento",
];

const inputClass =
  "h-12 w-full rounded-xl border border-imt-border bg-imt-bg px-4 text-base text-imt-text transition-[border-color,box-shadow] duration-300 placeholder:text-imt-dim hover:border-imt-border-solid focus-visible:border-imt-accent focus-visible:shadow-[0_0_0_4px_rgba(163,230,53,0.15)] aria-[invalid=true]:border-red-300";

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-imt-text">
        {label}
        {required ? (
          <span className="text-imt-accent" aria-hidden="true">
            {" "}
            *
          </span>
        ) : (
          <span className="font-normal text-imt-muted"> (opcional)</span>
        )}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-imt-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  name,
  label,
  options,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  error?: string;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue ?? ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(inputClass, "appearance-none pr-10")}
        >
          <option value="">Selecciona una opción</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-imt-muted" aria-hidden />
      </div>
    </Field>
  );
}

const STEPS: { title: string; fields: (keyof FieldErrors)[] }[] = [
  { title: "Tus datos", fields: ["nombre", "empresa", "cargo", "whatsapp", "email"] },
  { title: "Tu empresa", fields: ["plan", "ventas", "equipo", "inversion", "herramientas", "herramientasOtras"] },
  { title: "Lo que te duele", fields: ["dolor", "consentimiento"] },
];

function stepOf(field: keyof FieldErrors) {
  const i = STEPS.findIndex((s) => s.fields.includes(field));
  return i === -1 ? STEPS.length - 1 : i;
}

function SuccessView({
  plan,
  calLink,
  whatsappHref,
}: {
  plan: PlanId | null;
  calLink?: string;
  whatsappHref: string | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="imt-card animate-in fade-in zoom-in-95 overflow-hidden p-6 duration-500 sm:p-10" role="status">
      <div className="relative size-16">
        <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-imt-accent/30 [animation-iteration-count:2]" />
        <svg viewBox="0 0 48 48" className="relative size-16" aria-hidden="true">
          <circle cx="24" cy="24" r="22" fill="#A3E635" />
          <path
            d="M14 25l7 7 13-15"
            pathLength={1}
            fill="none"
            stroke="#050705"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1"
            className="[animation:imt-draw_600ms_ease_300ms_both] [stroke-dashoffset:1]"
          />
        </svg>
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 animate-in fade-in slide-in-from-bottom-2 text-3xl font-bold outline-none duration-500 [animation-delay:200ms] [animation-fill-mode:both] sm:text-4xl"
      >
        Recibimos tu diagnóstico.
      </h2>
      <p className="mt-3 animate-in fade-in text-lg text-imt-muted duration-500 [animation-delay:350ms] [animation-fill-mode:both]">
        Te escribimos en menos de 24 horas hábiles{plan ? ` sobre el plan ${planName(plan)}` : ""}. No tienes que hacer nada más.
      </p>

      {calLink ? (
        <div className="mt-10 animate-in fade-in duration-700 [animation-delay:500ms] [animation-fill-mode:both]">
          <h3 className="text-xl font-bold">¿Quieres adelantar? Reserva la llamada de 30 minutos</h3>
          <p className="mt-2 text-sm text-imt-muted">Opcional. Elige el horario que te sirva; llegamos con tu formulario leído.</p>
          <div className="mt-6">
            <CalEmbed calLink={calLink} namespace="diagnostico" brandColor="#A3E635" />
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex animate-in flex-col gap-3 fade-in duration-500 [animation-delay:600ms] [animation-fill-mode:both] sm:flex-row sm:items-center">
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md")}>
            <MessageCircle className="size-4" aria-hidden />
            Escríbenos por WhatsApp (opcional)
          </a>
        ) : null}
        <Link href="/" className={buttonClasses("secondary", "md")}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export function DiagnosticoForm({ calLink }: { calLink?: string }) {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const initialPlan = isPlanId(planParam) ? planParam : "";

  const [state, formAction, pending] = useActionState(diagnosticoAction, INITIAL);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [otrasChecked, setOtrasChecked] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId();
  const id = (name: string) => `${baseId}-${name}`;
  const last = STEPS.length - 1;

  const errors: FieldErrors =
    Object.keys(clientErrors).length > 0 ? clientErrors : state.status === "error" ? (state.fieldErrors ?? {}) : {};

  const focusField = (field: keyof FieldErrors) => {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus());
  };

  const goTo = (target: number) => {
    setDirection(target > step ? "forward" : "back");
    setStep(target);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // Server-side validation error: jump to the step of the first bad field.
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const first = FIELD_ORDER.find((key) => state.fieldErrors?.[key]);
    if (!first) return;
    setDirection("back");
    setStep(stepOf(first));
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
  }, [state]);

  if (state.status === "success") {
    return <SuccessView plan={state.plan} calLink={calLink} whatsappHref={state.whatsappUrl} />;
  }

  const validate = (form: HTMLFormElement, upTo: number) => {
    const formData = new FormData(form);
    const parsed = diagnosticoSchema.safeParse(diagnosticoFromFormData(formData));
    if (parsed.success) return { formData, errors: {} as FieldErrors };
    const all = fieldErrorsFrom(parsed.error);
    const relevant: FieldErrors = {};
    for (const key of Object.keys(all) as (keyof FieldErrors)[]) {
      if (stepOf(key) <= upTo) relevant[key] = all[key];
    }
    return { formData, errors: relevant };
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const { formData, errors: found } = validate(form, step);
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) {
      setClientErrors(found);
      if (stepOf(first) !== step) goTo(stepOf(first));
      focusField(first);
      return;
    }
    setClientErrors({});
    if (step < last) {
      goTo(step + 1);
      return;
    }
    // Manual dispatch (not <form action>) so React does not reset the fields
    // when the server answers with an error.
    startTransition(() => formAction(formData));
  };

  const describedBy = (name: keyof FieldErrors) => (errors[name] ? `${id(name)}-error` : undefined);
  const panelClass = (i: number) =>
    cn(
      "animate-in fade-in duration-500",
      direction === "forward" ? "slide-in-from-right-8" : "slide-in-from-left-8",
      step !== i && "hidden",
    );

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="imt-card scroll-mt-28 p-6 sm:p-8" aria-describedby={id("required-note")}>
      {/* Progress */}
      <ol className="grid grid-cols-3 gap-2" aria-label="Pasos del diagnóstico">
        {STEPS.map((s, i) => (
          <li key={s.title} aria-current={step === i ? "step" : undefined}>
            <span className="block h-1.5 overflow-hidden rounded-full bg-imt-border-solid">
              <span
                className="block h-full rounded-full bg-imt-accent transition-transform duration-500 ease-out"
                style={{ transform: `scaleX(${i <= step ? 1 : 0})`, transformOrigin: "0 50%" }}
              />
            </span>
            <span className={cn("mt-2 block text-xs sm:text-sm", i === step ? "font-semibold text-imt-text" : "text-imt-muted")}>
              {i + 1}. {s.title}
            </span>
          </li>
        ))}
      </ol>

      <p id={id("required-note")} className="mt-5 text-sm text-imt-muted">
        Paso {step + 1} de {STEPS.length}. Los campos con <span className="text-imt-accent">*</span> son obligatorios.
      </p>

      {state.status === "error" && !state.fieldErrors ? (
        <p className="mt-5 rounded-xl border border-red-300 px-4 py-3 text-sm text-red-300" role="alert">
          {state.message}
        </p>
      ) : null}

      {/* Honeypot: hidden from people and assistive tech. */}
      <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
        <label htmlFor={id("website")}>Sitio web</label>
        <input id={id("website")} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Step 1 */}
      <fieldset className={cn("mt-6 grid gap-5 sm:grid-cols-2", panelClass(0))}>
        <legend className="sr-only">Tus datos</legend>
        <Field id={id("nombre")} label="Nombre" required error={errors.nombre}>
          <input id={id("nombre")} name="nombre" type="text" autoComplete="name" required aria-invalid={errors.nombre ? true : undefined} aria-describedby={describedBy("nombre")} className={inputClass} />
        </Field>
        <Field id={id("empresa")} label="Empresa" required error={errors.empresa}>
          <input id={id("empresa")} name="empresa" type="text" autoComplete="organization" required aria-invalid={errors.empresa ? true : undefined} aria-describedby={describedBy("empresa")} className={inputClass} />
        </Field>
        <Field id={id("cargo")} label="Cargo" error={errors.cargo}>
          <input id={id("cargo")} name="cargo" type="text" autoComplete="organization-title" aria-invalid={errors.cargo ? true : undefined} aria-describedby={describedBy("cargo")} className={inputClass} />
        </Field>
        <Field id={id("whatsapp")} label="WhatsApp" required error={errors.whatsapp} hint="Con indicativo si no es de Colombia.">
          <input id={id("whatsapp")} name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" required aria-invalid={errors.whatsapp ? true : undefined} aria-describedby={describedBy("whatsapp") ?? `${id("whatsapp")}-hint`} className={inputClass} />
        </Field>
        <Field id={id("email")} label="Email" required error={errors.email} className="sm:col-span-2">
          <input id={id("email")} name="email" type="email" inputMode="email" autoComplete="email" required aria-invalid={errors.email ? true : undefined} aria-describedby={describedBy("email")} className={inputClass} />
        </Field>
      </fieldset>

      {/* Step 2 */}
      <fieldset className={cn("mt-6 grid gap-5 sm:grid-cols-2", panelClass(1))}>
        <legend className="sr-only">Tu empresa</legend>
        <SelectField
          id={id("plan")}
          name="plan"
          label="Plan de interés"
          options={PLANS.map((p) => ({ value: p.id, label: p.name.charAt(0) + p.name.slice(1).toLowerCase() }))}
          defaultValue={initialPlan}
          error={errors.plan}
        />
        <SelectField id={id("ventas")} name="ventas" label="Ventas mensuales aproximadas" options={VENTAS_OPTIONS} error={errors.ventas} />
        <SelectField id={id("equipo")} name="equipo" label="Tamaño del equipo" options={EQUIPO_OPTIONS} error={errors.equipo} />
        <SelectField id={id("inversion")} name="inversion" label="Inversión mensual contemplada" options={INVERSION_OPTIONS} error={errors.inversion} />

        <fieldset className="sm:col-span-2" aria-describedby={describedBy("herramientas")}>
          <legend className="text-sm font-medium text-imt-text">
            Herramientas que usan <span className="font-normal text-imt-muted">(opcional)</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {HERRAMIENTAS_OPTIONS.map((tool) => (
              <label
                key={tool.value}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-imt-border bg-imt-bg px-4 text-sm text-imt-text transition-all duration-300 hover:border-imt-border-solid has-[:checked]:scale-[1.04] has-[:checked]:border-imt-accent has-[:checked]:text-imt-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-imt-accent"
              >
                <input
                  type="checkbox"
                  name="herramientas"
                  value={tool.value}
                  className="size-4 accent-[#A3E635]"
                  onChange={tool.value === "otras" ? (e) => setOtrasChecked(e.target.checked) : undefined}
                />
                {tool.label}
              </label>
            ))}
          </div>
          {errors.herramientas ? (
            <p id={`${id("herramientas")}-error`} className="mt-2 text-sm text-red-300" role="alert">
              {errors.herramientas}
            </p>
          ) : null}
        </fieldset>

        {otrasChecked ? (
          <Field
            id={id("herramientasOtras")}
            label="¿Cuáles otras?"
            error={errors.herramientasOtras}
            className="animate-in fade-in slide-in-from-top-2 duration-300 sm:col-span-2"
          >
            <input id={id("herramientasOtras")} name="herramientasOtras" type="text" aria-invalid={errors.herramientasOtras ? true : undefined} aria-describedby={describedBy("herramientasOtras")} className={inputClass} />
          </Field>
        ) : null}
      </fieldset>

      {/* Step 3 */}
      <div className={cn("mt-6", panelClass(2))}>
        <Field id={id("dolor")} label="Proceso que más te duele hoy" required error={errors.dolor}>
          <textarea
            id={id("dolor")}
            name="dolor"
            rows={6}
            required
            placeholder="Ej.: las cotizaciones se hacen a mano en Excel y tardan dos días."
            aria-invalid={errors.dolor ? true : undefined}
            aria-describedby={describedBy("dolor")}
            className={cn(inputClass, "h-auto min-h-36 resize-y py-3")}
          />
        </Field>

        <label className="mt-8 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-imt-muted">
          <input
            type="checkbox"
            name="consentimiento"
            required
            aria-invalid={errors.consentimiento ? true : undefined}
            aria-describedby={describedBy("consentimiento")}
            className="mt-1 size-4 shrink-0 accent-[#A3E635]"
          />
          <span>
            Autorizo a Alexander Cast · IA Master Tech a tratar mis datos personales para responder esta solicitud,
            conforme a la Ley 1581 de 2012 y a la{" "}
            <Link href="/legal/privacidad" target="_blank" className="text-imt-accent underline underline-offset-4 hover:text-imt-text">
              política de privacidad
            </Link>
            . <span className="text-imt-accent" aria-hidden="true">*</span>
          </span>
        </label>
        {errors.consentimiento ? (
          <p id={`${id("consentimiento")}-error`} className="mt-2 text-sm text-red-300" role="alert">
            {errors.consentimiento}
          </p>
        ) : null}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-imt-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => goTo(step - 1)} className={buttonClasses("secondary", "md")}>
            <ArrowLeft className="size-4" aria-hidden />
            Atrás
          </button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Enviando…
            </>
          ) : step < last ? (
            <>
              Siguiente
              <ArrowRight className="size-4" aria-hidden />
            </>
          ) : (
            <>
              Enviar diagnóstico
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
