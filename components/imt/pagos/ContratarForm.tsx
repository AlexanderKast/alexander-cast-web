"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { formatCop, PLANS, type PlanId } from "@/content/imt";
import { buttonClasses } from "@/components/imt/ui/Button";
import { importeCop, MESES_MINIMOS, type Periodo } from "@/lib/imt/pagos";
import { cn } from "@/lib/utils";
import { Campo, inputClass } from "./campos";

type Errores = Record<string, string>;

export function ContratarForm({
  plan,
  periodo,
  cancelado,
}: {
  plan: PlanId;
  periodo: Periodo;
  cancelado: boolean;
}) {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState<string | null>(
    cancelado ? "Cancelaste el pago. Puedes retomarlo cuando quieras." : null,
  );
  const [enviando, setEnviando] = useState(false);

  const datos = PLANS.find((p) => p.id === plan)!;
  const importe = importeCop(plan, periodo);
  const otro: Periodo = periodo === "mensual" ? "anual" : "mensual";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    setErrores({});
    setMensaje(null);
    try {
      const res = await fetch("/api/imt/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          periodo,
          nombre: f.get("nombre"),
          empresa: f.get("empresa"),
          email: f.get("email"),
          whatsapp: f.get("whatsapp"),
          acepta: f.get("acepta") === "on",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string; campos?: Errores };
      if (res.ok && json.url) {
        window.location.assign(json.url);
        return;
      }
      setErrores(json.campos ?? {});
      setMensaje(json.error ?? "No pudimos iniciar el pago. Intenta de nuevo.");
    } catch {
      setMensaje("Sin conexión. Revisa tu internet e intenta de nuevo.");
    }
    setEnviando(false);
  }

  const invalido = (n: string) => (errores[n] ? true : undefined);
  const describe = (n: string) => (errores[n] ? `${id(n)}-error` : undefined);

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
      <aside className="imt-card h-fit p-6 sm:p-8 lg:sticky lg:top-28">
        <p className="font-imt-mono text-sm tracking-[0.22em] text-imt-accent">{datos.name}</p>
        <p className="mt-4 text-sm text-imt-muted">{periodo === "anual" ? "Pago único anual" : "Suscripción mensual"}</p>
        <p className="font-imt-display text-4xl font-bold tabular-nums text-imt-text sm:text-5xl">
          {formatCop(importe)}{" "}
          <span className="text-base font-normal text-imt-muted">COP{periodo === "mensual" ? "/mes" : ""}</span>
        </p>
        {periodo === "anual" ? (
          <p className="mt-2 text-sm text-imt-muted">
            Pagas 10 meses y recibes 12 ({formatCop(importeCop(plan, "mensual") * 2)} de ahorro).
          </p>
        ) : null}
        <ul className="mt-6 space-y-2 border-t border-imt-border pt-6 text-imt-text">
          <li>{datos.hours}</li>
          <li>{datos.projects}</li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-imt-muted">{datos.description}</p>
        <p className="mt-6 text-xs leading-relaxed text-imt-muted">
          Contrato mínimo de {MESES_MINIMOS} meses. Las herramientas de terceros (APIs, plataformas, servidores,
          licencias) las asume el cliente.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/contratar?plan=${plan}&periodo=${otro}`}
            className="text-imt-accent underline underline-offset-4 hover:text-imt-text"
          >
            Cambiar a {otro}
          </Link>
          <Link href="/planes" className="text-imt-muted underline underline-offset-4 hover:text-imt-text">
            Ver otros planes
          </Link>
        </div>
      </aside>

      <form onSubmit={onSubmit} noValidate className="imt-card p-6 sm:p-8" aria-label="Datos para contratar">
        <h2 className="font-imt-display text-2xl font-bold">Tus datos</h2>
        <p className="mt-1 text-sm text-imt-muted">
          Después te llevamos a Stripe para pagar con tarjeta de forma segura.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Campo id={id("nombre")} label="Nombre" error={errores.nombre}>
            <input id={id("nombre")} name="nombre" type="text" autoComplete="name" required aria-invalid={invalido("nombre")} aria-describedby={describe("nombre")} className={inputClass} />
          </Campo>
          <Campo id={id("empresa")} label="Empresa" error={errores.empresa}>
            <input id={id("empresa")} name="empresa" type="text" autoComplete="organization" required aria-invalid={invalido("empresa")} aria-describedby={describe("empresa")} className={inputClass} />
          </Campo>
          <Campo id={id("email")} label="Correo" error={errores.email} hint="Aquí llega tu confirmación.">
            <input id={id("email")} name="email" type="email" autoComplete="email" required aria-invalid={invalido("email")} aria-describedby={describe("email") ?? `${id("email")}-hint`} className={inputClass} />
          </Campo>
          <Campo id={id("whatsapp")} label="WhatsApp" error={errores.whatsapp} hint="Te escribimos para arrancar.">
            <input id={id("whatsapp")} name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" required aria-invalid={invalido("whatsapp")} aria-describedby={describe("whatsapp") ?? `${id("whatsapp")}-hint`} className={inputClass} />
          </Campo>
        </div>

        <div className="mt-6">
          <label className="flex items-start gap-3 text-sm text-imt-muted">
            <input id={id("acepta")} name="acepta" type="checkbox" required aria-invalid={invalido("acepta")} aria-describedby={describe("acepta")} className="mt-1 size-5 shrink-0 accent-[#a3e635]" />
            <span>
              Acepto los{" "}
              <Link href="/legal/terminos" target="_blank" className="text-imt-accent underline underline-offset-4 hover:text-imt-text">
                términos
              </Link>{" "}
              y la{" "}
              <Link href="/legal/privacidad" target="_blank" className="text-imt-accent underline underline-offset-4 hover:text-imt-text">
                política de privacidad
              </Link>
              , y entiendo que el contrato tiene un mínimo de {MESES_MINIMOS} meses.
            </span>
          </label>
          {errores.acepta ? (
            <p id={`${id("acepta")}-error`} className="mt-2 text-sm text-red-300" role="alert">
              {errores.acepta}
            </p>
          ) : null}
        </div>

        <p className={cn("mt-5 min-h-6 text-sm", mensaje ? "text-red-300" : "")} role="status" aria-live="polite">
          {mensaje}
        </p>

        <button type="submit" disabled={enviando} className={buttonClasses("primary", "lg", "mt-2 w-full disabled:opacity-60")}>
          {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
          {enviando ? "Abriendo el pago…" : `Pagar ${formatCop(importe)} COP`}
          {!enviando ? <ArrowRight className="size-4" aria-hidden /> : null}
        </button>
        <p className="mt-4 text-center text-xs text-imt-muted">
          Pago procesado por Stripe. No guardamos los datos de tu tarjeta.{" "}
          <Link href="/diagnostico" className="underline underline-offset-4 hover:text-imt-text">
            ¿Prefieres hablar antes? Agenda tu diagnóstico.
          </Link>
        </p>
      </form>
    </div>
  );
}
