"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { capturarLead, irAlPago, type EstadoLead, type EstadoPago } from "@/app/comunidad/compra-actions";
import { Campo, botonCls, botonSecundarioCls, inputCls } from "./ui";

export interface OpcionNivel {
  id: "preventa" | "regular" | "vip";
  nombre: string;
  precio: string; // ya formateado, p. ej. «$790.000»
  nota: string;
  extras: string[];
}

const LEAD_INICIAL: EstadoLead = { status: "idle" };
const PAGO_INICIAL: EstadoPago = { status: "idle" };

function Progreso({ paso }: { paso: 1 | 2 }) {
  return (
    <div aria-label={`Paso ${paso} de 2`}>
      <div className="grid grid-cols-2 gap-2" aria-hidden="true">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={"h-1.5 rounded-full " + (n <= paso ? "bg-[var(--mia-accent)]" : "bg-[var(--mia-surface)]")}
          />
        ))}
      </div>
      <p className="mia-label mt-2 !mb-0">
        Paso {paso} de 2 · {paso === 1 ? "Tus datos" : "Tu entrada y el pago"}
      </p>
    </div>
  );
}

/**
 * Compra en dos pasos. Paso 1: datos y consentimiento (se guardan como lead).
 * Paso 2: eliges la entrada y pasas al checkout seguro de Stripe.
 * Si vuelves desde Stripe (cancelaste), `pedidoInicial` te deja directo en el paso 2.
 */
export function FormCompra({
  niveles,
  nivelInicial,
  origen,
  pedidoInicial,
}: {
  niveles: OpcionNivel[];
  nivelInicial: OpcionNivel["id"];
  origen: "web" | "stand";
  pedidoInicial: { id: string; nombre: string } | null;
}) {
  const [editando, setEditando] = useState(false);
  const [lead, accionLead, pendienteLead] = useActionState(async (prev: EstadoLead, fd: FormData) => {
    const r = await capturarLead(prev, fd);
    if (r.status === "ok") setEditando(false);
    return r;
  }, LEAD_INICIAL);
  const [pago, accionPago, pendientePago] = useActionState(irAlPago, PAGO_INICIAL);
  const [nivel, setNivel] = useState<OpcionNivel["id"]>(nivelInicial);

  const guardado = lead.status === "ok" ? { id: lead.pedidoId, nombre: lead.nombre } : pedidoInicial;
  const paso: 1 | 2 = guardado && !editando ? 2 : 1;
  const errores = lead.status === "error" ? (lead.fieldErrors ?? {}) : {};
  const elegido = niveles.find((n) => n.id === nivel) ?? niveles[0];

  return (
    <div className="space-y-5">
      <Progreso paso={paso} />

      {/* Paso 1 — se oculta (no se desmonta) para conservar lo escrito si vuelves a editar. */}
      <form action={accionLead} hidden={paso !== 1} className="space-y-4">
        <input type="hidden" name="o" value={origen} />
        <Campo etiqueta="Nombre completo" error={errores.nombre}>
          <input
            name="nombre"
            required
            autoComplete="name"
            autoCapitalize="words"
            defaultValue={guardado?.nombre}
            className={inputCls}
          />
        </Campo>
        <Campo etiqueta="Correo (aquí llega tu acceso)" error={errores.email}>
          <input
            name="email"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            className={inputCls}
          />
        </Campo>
        <Campo etiqueta="WhatsApp (con indicativo)" error={errores.whatsapp}>
          <input
            name="whatsapp"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            placeholder="+57 300 000 0000"
            className={inputCls}
          />
        </Campo>

        {/* Honeypot */}
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <label className="flex items-start gap-3 text-sm leading-snug">
          <input type="checkbox" name="acepto" required className="mt-0.5 size-5 shrink-0 accent-[#65a30d]" />
          <span>
            Autorizo el tratamiento de mis datos personales según la{" "}
            <Link href="/legal/privacidad" target="_blank" className="mia-link">
              política de privacidad
            </Link>{" "}
            (Ley 1581 de 2012).
          </span>
        </label>
        {errores.acepto ? <p className="mia-error">{errores.acepto}</p> : null}

        <button type="submit" disabled={pendienteLead} className={botonCls + " mia-btn-block"}>
          {pendienteLead ? "Guardando…" : "Continuar"}
        </button>
        {lead.status === "error" && !lead.fieldErrors ? (
          <p role="alert" className="mia-alert mia-alert-error">
            {lead.message}
          </p>
        ) : null}
      </form>

      {/* Paso 2 */}
      {paso === 2 && guardado ? (
        <form action={accionPago} className="space-y-4">
          <input type="hidden" name="pedido" value={guardado.id} />

          <p className="text-sm">
            Hola <strong>{guardado.nombre.split(" ")[0]}</strong>, tus datos quedaron guardados. Elige tu entrada:
          </p>

          <fieldset>
            <legend className="sr-only">Elige tu entrada</legend>
            <div className="space-y-2">
              {niveles.map((n) => (
                <label key={n.id} className="block cursor-pointer">
                  <input
                    type="radio"
                    name="nivel"
                    value={n.id}
                    checked={nivel === n.id}
                    onChange={() => setNivel(n.id)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-2xl border border-[var(--mia-border-strong)] bg-[var(--mia-elev)] p-4 transition-colors peer-checked:border-[var(--mia-accent-ink)] peer-checked:bg-[var(--mia-accent-soft)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--mia-accent-ink)]">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold">{n.nombre}</span>
                      <span className="font-[family-name:var(--mia-font-display)] text-xl font-bold tracking-tight">
                        {n.precio}
                      </span>
                    </span>
                    <span className="mia-muted mt-1 block text-xs leading-snug">{n.nota}</span>
                    {n.extras.length ? (
                      <span className="mt-2 block space-y-1 text-xs">
                        {n.extras.map((x) => (
                          <span key={x} className="flex gap-2">
                            <span aria-hidden="true">✓</span>
                            {x}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" disabled={pendientePago} className={botonCls + " mia-btn-block"}>
            {pendientePago ? "Llevándote al pago…" : `Pagar ${elegido.precio} COP`}
          </button>
          <p className="mia-muted text-center text-xs">
            Pagas en el checkout seguro de Stripe, en pesos colombianos. Al terminar recibes tu acceso por correo,
            sin contraseña.
          </p>
          {pago.status === "error" ? (
            <p role="alert" className="mia-alert mia-alert-error">
              {pago.message}
            </p>
          ) : null}

          <button type="button" onClick={() => setEditando(true)} className={botonSecundarioCls + " mia-btn-block"}>
            ← Editar mis datos
          </button>
        </form>
      ) : null}
    </div>
  );
}
