"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { registrarReferidorAction, type ReferidoState } from "@/app/actions/referidos";
import { buttonClasses } from "@/components/imt/ui/Button";
import { Campo, inputClass } from "./campos";

const INICIAL: ReferidoState = { status: "idle" };

export function ReferidoForm() {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const [estado, accion, pendiente] = useActionState(registrarReferidorAction, INICIAL);

  if (estado.status === "success") {
    return (
      <div className="imt-card p-6 text-center sm:p-10" role="status">
        <MailCheck className="mx-auto size-10 text-imt-accent" aria-hidden />
        <h2 className="mt-4 font-imt-display text-2xl font-bold">Revisa tu correo</h2>
        <p className="mt-2 text-imt-muted">
          Te enviamos tu enlace personal y el acceso a tu panel. Si no llega en unos minutos, mira en spam.
        </p>
      </div>
    );
  }

  const errores = estado.status === "error" ? (estado.fieldErrors ?? {}) : {};
  const invalido = (n: string) => (errores[n] ? true : undefined);
  const describe = (n: string) => (errores[n] ? `${id(n)}-error` : undefined);

  return (
    <form action={accion} noValidate className="imt-card p-6 sm:p-8" aria-label="Registro de referidores">
      <h2 className="font-imt-display text-2xl font-bold">Recibe tu enlace</h2>
      <p className="mt-1 text-sm text-imt-muted">Es gratis y no necesitas cuenta. Te lo enviamos por correo.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Campo id={id("nombre")} label="Nombre" error={errores.nombre} className="sm:col-span-2">
          <input id={id("nombre")} name="nombre" type="text" autoComplete="name" required aria-invalid={invalido("nombre")} aria-describedby={describe("nombre")} className={inputClass} />
        </Campo>
        <Campo id={id("email")} label="Correo" error={errores.email} hint="Aquí llegan tu enlace y tu panel.">
          <input id={id("email")} name="email" type="email" autoComplete="email" required aria-invalid={invalido("email")} aria-describedby={describe("email") ?? `${id("email")}-hint`} className={inputClass} />
        </Campo>
        <Campo id={id("whatsapp")} label="WhatsApp" error={errores.whatsapp} hint="Para coordinar el pago de tus comisiones.">
          <input id={id("whatsapp")} name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" required aria-invalid={invalido("whatsapp")} aria-describedby={describe("whatsapp") ?? `${id("whatsapp")}-hint`} className={inputClass} />
        </Campo>
      </div>

      {/* Honeypot: invisible para personas. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No llenar
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-6">
        <label className="flex items-start gap-3 text-sm text-imt-muted">
          <input id={id("acepta")} name="acepta" type="checkbox" required aria-invalid={invalido("acepta")} aria-describedby={describe("acepta")} className="mt-1 size-5 shrink-0 accent-[#a3e635]" />
          <span>
            Acepto las condiciones del programa y la{" "}
            <Link href="/legal/privacidad" target="_blank" className="text-imt-accent underline underline-offset-4 hover:text-imt-text">
              política de privacidad
            </Link>
            .
          </span>
        </label>
        {errores.acepta ? (
          <p id={`${id("acepta")}-error`} className="mt-2 text-sm text-red-300" role="alert">
            {errores.acepta}
          </p>
        ) : null}
      </div>

      <p className="mt-5 min-h-6 text-sm text-red-300" role="status" aria-live="polite">
        {estado.status === "error" ? estado.message : null}
      </p>

      <button type="submit" disabled={pendiente} className={buttonClasses("primary", "lg", "mt-2 w-full disabled:opacity-60")}>
        {pendiente ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {pendiente ? "Enviando…" : "Quiero mi enlace"}
        {!pendiente ? <ArrowRight className="size-4" aria-hidden /> : null}
      </button>
    </form>
  );
}
