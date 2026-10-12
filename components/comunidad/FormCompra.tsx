"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { iniciarCompra } from "@/app/comunidad/compra-actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

export interface OpcionNivel {
  id: "preventa" | "regular" | "vip";
  nombre: string;
  precio: string; // ya formateado, p. ej. «$790.000»
  nota: string;
  extras: string[];
}

export function FormCompra({
  niveles,
  nivelInicial,
  origen,
}: {
  niveles: OpcionNivel[];
  nivelInicial: OpcionNivel["id"];
  origen: "web" | "stand";
}) {
  const [estado, accion, pendiente] = useActionState(iniciarCompra, INICIAL);
  const [nivel, setNivel] = useState<OpcionNivel["id"]>(nivelInicial);
  const errores = estado.status === "error" ? (estado.fieldErrors ?? {}) : {};
  const elegido = niveles.find((n) => n.id === nivel) ?? niveles[0];

  return (
    <form action={accion} className="space-y-4">
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
        {errores.nivel ? <p className="mia-error">{errores.nivel}</p> : null}
      </fieldset>

      <Campo etiqueta="Nombre completo" error={errores.nombre}>
        <input name="nombre" required autoComplete="name" autoCapitalize="words" className={inputCls} />
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

      <button type="submit" disabled={pendiente} className={botonCls + " mia-btn-block"}>
        {pendiente ? "Llevándote al pago…" : `Pagar ${elegido.precio} COP y entrar`}
      </button>
      <p className="mia-muted text-center text-xs">
        Pago seguro con Stripe, en pesos colombianos. Al terminar recibes tu acceso por correo, sin contraseña.
      </p>
      <Aviso estado={estado} />
    </form>
  );
}
