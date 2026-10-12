"use client";

import { useActionState } from "react";
import Link from "next/link";
import { iniciarCompra } from "@/app/comunidad/compra-actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

export function FormCompra({ precio, origen }: { precio: string; origen: "web" | "stand" }) {
  const [estado, accion, pendiente] = useActionState(iniciarCompra, INICIAL);
  const errores = estado.status === "error" ? (estado.fieldErrors ?? {}) : {};

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="o" value={origen} />
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
        {pendiente ? "Llevándote al pago…" : `Pagar ${precio} y entrar`}
      </button>
      <p className="mia-muted text-center text-xs">
        Pago seguro con Stripe. Al terminar recibes tu acceso por correo, sin contraseña.
      </p>
      <Aviso estado={estado} />
    </form>
  );
}
