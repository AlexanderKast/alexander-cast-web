"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, CircleCheck, LoaderCircle, MessageCircle } from "lucide-react";
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
import { whatsappUrl } from "@/site.config";
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
  "h-12 w-full rounded-xl border border-imt-border bg-imt-bg px-4 text-base text-imt-text transition-colors placeholder:text-imt-dim hover:border-imt-border-solid focus-visible:border-imt-cyan aria-[invalid=true]:border-red-300";

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
          <span className="text-imt-cyan" aria-hidden="true">
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

function SuccessView({ empresa, plan, calLink }: { empresa: string; plan: PlanId | null; calLink?: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const message = `Hola Alexander, acabo de enviar el diagnóstico de ${empresa} en IA Master Tech${
    plan ? ` (plan ${planName(plan)})` : ""
  }.`;

  return (
    <div className="imt-card p-6 sm:p-10" role="status">
      <CircleCheck className="size-10 text-imt-cyan" aria-hidden />
      <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-3xl font-bold outline-none sm:text-4xl">
        Recibimos tu diagnóstico.
      </h2>
      <p className="mt-3 text-lg text-imt-muted">Te escribimos en menos de 24 horas hábiles.</p>

      {calLink ? (
        <div className="mt-10">
          <h3 className="text-xl font-bold">¿Quieres adelantar? Reserva la llamada de 30 minutos</h3>
          <p className="mt-2 text-sm text-imt-muted">Elige el horario que te sirva. Llegamos con tu formulario leído.</p>
          <div className="mt-6">
            <CalEmbed calLink={calLink} namespace="diagnostico" brandColor="#22D3EE" />
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md")}>
          <MessageCircle className="size-4" aria-hidden />
          Escríbenos por WhatsApp
        </a>
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
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId();
  const id = (name: string) => `${baseId}-${name}`;

  const errors: FieldErrors =
    Object.keys(clientErrors).length > 0 ? clientErrors : state.status === "error" ? (state.fieldErrors ?? {}) : {};

  // Move focus to the first invalid field after a server-side validation error.
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    const first = FIELD_ORDER.find((key) => state.fieldErrors?.[key]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }, [state]);

  if (state.status === "success") {
    return <SuccessView empresa={state.empresa} plan={state.plan} calLink={calLink} />;
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const parsed = diagnosticoSchema.safeParse(diagnosticoFromFormData(formData));
    if (!parsed.success) {
      const next = fieldErrorsFrom(parsed.error);
      setClientErrors(next);
      const first = FIELD_ORDER.find((key) => next[key]);
      if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setClientErrors({});
    // Manual dispatch (not <form action>) so React does not reset the fields
    // when the server answers with an error.
    startTransition(() => formAction(formData));
  };

  const describedBy = (name: keyof FieldErrors) => (errors[name] ? `${id(name)}-error` : undefined);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="imt-card p-6 sm:p-8" aria-describedby={id("required-note")}>
      <p id={id("required-note")} className="text-sm text-imt-muted">
        Los campos con <span className="text-imt-cyan">*</span> son obligatorios. Toma unos 3 minutos.
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

      <fieldset className="mt-6 grid gap-5 sm:grid-cols-2">
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

      <fieldset className="mt-8 grid gap-5 border-t border-imt-border pt-8 sm:grid-cols-2">
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

        <Field id={id("dolor")} label="Proceso que más te duele hoy" required error={errors.dolor} className="sm:col-span-2">
          <textarea
            id={id("dolor")}
            name="dolor"
            rows={5}
            required
            placeholder="Ej.: las cotizaciones se hacen a mano en Excel y tardan dos días."
            aria-invalid={errors.dolor ? true : undefined}
            aria-describedby={describedBy("dolor")}
            className={cn(inputClass, "h-auto min-h-32 resize-y py-3")}
          />
        </Field>

        <fieldset className="sm:col-span-2" aria-describedby={describedBy("herramientas")}>
          <legend className="text-sm font-medium text-imt-text">
            Herramientas que usan <span className="font-normal text-imt-muted">(opcional)</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {HERRAMIENTAS_OPTIONS.map((tool) => (
              <label
                key={tool.value}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-imt-border bg-imt-bg px-4 text-sm text-imt-text transition-colors hover:border-imt-border-solid has-[:checked]:border-imt-cyan has-[:checked]:text-imt-cyan has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-imt-cyan"
              >
                <input
                  type="checkbox"
                  name="herramientas"
                  value={tool.value}
                  className="size-4 accent-[#22d3ee]"
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
          <Field id={id("herramientasOtras")} label="¿Cuáles otras?" error={errors.herramientasOtras} className="sm:col-span-2">
            <input id={id("herramientasOtras")} name="herramientasOtras" type="text" aria-invalid={errors.herramientasOtras ? true : undefined} aria-describedby={describedBy("herramientasOtras")} className={inputClass} />
          </Field>
        ) : null}
      </fieldset>

      <div className="mt-8 border-t border-imt-border pt-8">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-imt-muted">
          <input
            type="checkbox"
            name="consentimiento"
            required
            aria-invalid={errors.consentimiento ? true : undefined}
            aria-describedby={describedBy("consentimiento")}
            className="mt-1 size-4 shrink-0 accent-[#22d3ee]"
          />
          <span>
            Autorizo a Alexander Cast · IA Master Tech a tratar mis datos personales para responder esta solicitud,
            conforme a la Ley 1581 de 2012 y a la{" "}
            <Link href="/legal/privacidad" target="_blank" className="text-imt-cyan underline underline-offset-4 hover:text-imt-text">
              política de privacidad
            </Link>
            . <span className="text-imt-cyan" aria-hidden="true">*</span>
          </span>
        </label>
        {errors.consentimiento ? (
          <p id={`${id("consentimiento")}-error`} className="mt-2 text-sm text-red-300" role="alert">
            {errors.consentimiento}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "mt-8 w-full sm:w-auto")}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              Enviando…
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
