"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
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
    <div>
      <div className="grid grid-cols-2 gap-2" aria-hidden="true">
        {[1, 2].map((n) => (
          <div
            key={n}
            className={"h-1.5 rounded-full " + (n <= paso ? "bg-[var(--mia-accent)]" : "bg-[var(--mia-surface)]")}
          />
        ))}
      </div>
      <p className="mia-label mt-2 !mb-0" aria-live="polite">
        Paso {paso} de 2 · {paso === 1 ? "Tu entrada y tus datos" : "Resumen y pago"}
      </p>
    </div>
  );
}

/**
 * Compra como invitado en dos pasos.
 *  1. Eliges la entrada (ves precio y diferencias) y dejas tus datos y el consentimiento.
 *  2. Revisas el resumen y pasas al checkout seguro de Stripe.
 * El precio que ves es informativo: el servidor lo recalcula y valida la disponibilidad.
 * Si cancelas en Stripe, tu pedido se retoma con una cookie firmada de este navegador.
 */
export function FormCompra({
  niveles,
  nivelInicial,
  origen,
  nombreRetomado,
}: {
  niveles: OpcionNivel[];
  nivelInicial: OpcionNivel["id"];
  origen: "web" | "stand";
  nombreRetomado: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [nivel, setNivel] = useState<OpcionNivel["id"]>(nivelInicial);
  const [lead, accionLead, pendienteLead] = useActionState(async (prev: EstadoLead, fd: FormData) => {
    const r = await capturarLead(prev, fd);
    if (r.status === "ok") setEditando(false);
    return r;
  }, LEAD_INICIAL);
  const [pago, accionPago, pendientePago] = useActionState(irAlPago, PAGO_INICIAL);

  const nombre = lead.status === "ok" ? lead.nombre : nombreRetomado;
  const sesionVencida = pago.status === "error" && pago.reiniciar === true;
  const paso: 1 | 2 = nombre && !editando && !sesionVencida ? 2 : 1;
  const errores = lead.status === "error" ? (lead.fieldErrors ?? {}) : {};
  const elegido = niveles.find((n) => n.id === nivel) ?? niveles[0];

  return (
    <div className="space-y-5">
      <Progreso paso={paso} />

      {/* Paso 1: se oculta (no se desmonta) para conservar lo escrito si vuelves a editar. */}
      <form action={accionLead} hidden={paso !== 1} className="space-y-4">
        <input type="hidden" name="o" value={origen} />

        <fieldset>
          <legend className="mia-label">Elige tu entrada</legend>
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
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Campo etiqueta="Nombre completo" error={errores.nombre}>
          <input
            name="nombre"
            required
            autoComplete="name"
            autoCapitalize="words"
            aria-invalid={errores.nombre ? true : undefined}
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
            aria-invalid={errores.email ? true : undefined}
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
            aria-invalid={errores.whatsapp ? true : undefined}
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
          <input
            type="checkbox"
            name="privacidad"
            required
            aria-invalid={errores.privacidad ? true : undefined}
            className="mt-0.5 size-5 shrink-0 accent-[#65a30d]"
          />
          <span>
            Autorizo el tratamiento de mis datos personales para gestionar mi inscripción, según la{" "}
            <Link href="/legal/privacidad" target="_blank" className="mia-link">
              política de privacidad
            </Link>{" "}
            (Ley 1581 de 2012).
          </span>
        </label>
        {errores.privacidad ? (
          <p role="alert" className="mia-error">
            {errores.privacidad}
          </p>
        ) : null}

        <button type="submit" disabled={pendienteLead} className={botonCls + " mia-btn-block"}>
          {pendienteLead ? "Guardando…" : "Continuar"}
        </button>
        {lead.status === "error" && !lead.fieldErrors ? (
          <p role="alert" className="mia-alert mia-alert-error">
            {lead.message}
          </p>
        ) : null}
        {sesionVencida && pago.status === "error" ? (
          <p role="alert" className="mia-alert mia-alert-error">
            {pago.message}
          </p>
        ) : null}
      </form>

      {/* Paso 2 */}
      {paso === 2 && nombre ? (
        <form action={accionPago} className="space-y-4">
          <input type="hidden" name="nivel" value={nivel} />

          <p className="text-sm">
            Hola <strong>{nombre.split(" ")[0]}</strong>, revisa tu pedido antes de pagar.
          </p>

          <div className="mia-card-soft !p-4 text-sm">
            <p className="mia-label !mb-1">Tu entrada</p>
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{elegido.nombre}</span>
              <span className="font-[family-name:var(--mia-font-display)] text-xl font-bold">{elegido.precio} COP</span>
            </p>
            {elegido.extras.length ? (
              <ul className="mt-3 space-y-1 text-xs">
                {elegido.extras.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span aria-hidden="true">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mia-muted mt-3 text-xs">El precio final lo confirma el servidor al crear el pago.</p>
          </div>

          <button
            type="submit"
            disabled={pendientePago}
            onClick={() => track("purchase_cta_click", { nivel })}
            className={botonCls + " mia-btn-block"}
          >
            {pendientePago ? "Llevándote al pago…" : `Pagar ${elegido.precio} COP`}
          </button>
          <p className="mia-muted text-center text-xs">
            Pagas en el checkout seguro de Stripe, en pesos colombianos. Al confirmarse el pago recibes tu acceso por
            correo, sin contraseña.
          </p>
          {pago.status === "error" && !pago.reiniciar ? (
            <p role="alert" className="mia-alert mia-alert-error">
              {pago.message}
            </p>
          ) : null}

          <button type="button" onClick={() => setEditando(true)} className={botonSecundarioCls + " mia-btn-block"}>
            ← Cambiar entrada o datos
          </button>
        </form>
      ) : null}
    </div>
  );
}
