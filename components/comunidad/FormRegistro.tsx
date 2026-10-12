"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { solicitarRegistro } from "@/app/comunidad/actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

/**
 * Crear cuenta. Pide solo lo necesario, sin precios ni pago. La privacidad es
 * obligatoria y NO viene marcada; el marketing es opcional y tampoco viene marcado.
 */
export function FormRegistro() {
  // Cambiar la clave desmonta el formulario: «pedir otro enlace» vuelve a un formulario limpio.
  const [intento, setIntento] = useState(0);
  return <FormularioRegistro key={intento} onOtroEnlace={() => setIntento((n) => n + 1)} />;
}

function FormularioRegistro({ onOtroEnlace }: { onOtroEnlace: () => void }) {
  const [estado, accion, pendiente] = useActionState(solicitarRegistro, INICIAL);
  const errores = estado.status === "error" ? (estado.fieldErrors ?? {}) : {};

  // Tras enviar, se reemplaza el formulario por la confirmación: no hay doble envío.
  if (estado.status === "ok") {
    return (
      <div className="space-y-4">
        <p role="status" className="mia-alert mia-alert-ok">
          {estado.message}
        </p>
        <p className="mia-muted text-sm">
          ¿No llegó? Espera un par de minutos y revisa el spam; si hace falta, puedes{" "}
          <button type="button" onClick={onOtroEnlace} className="mia-link">
            pedir otro enlace
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-4">
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
      <Campo etiqueta="Correo" error={errores.email}>
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
      <Campo etiqueta="WhatsApp (opcional)" error={errores.whatsapp}>
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
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

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm leading-snug">
          <input
            type="checkbox"
            name="privacidad"
            required
            aria-invalid={errores.privacidad ? true : undefined}
            className="mt-0.5 size-5 shrink-0 accent-[#65a30d]"
          />
          <span>
            Autorizo el tratamiento de mis datos personales para crear y gestionar mi cuenta, según la{" "}
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

        <label className="flex items-start gap-3 text-sm leading-snug">
          <input type="checkbox" name="marketing" className="mt-0.5 size-5 shrink-0 accent-[#65a30d]" />
          <span>
            Quiero recibir novedades y promociones de Master IA 360. <span className="mia-muted">(Opcional)</span>
          </span>
        </label>
      </div>

      <button type="submit" disabled={pendiente} className={botonCls + " mia-btn-block"}>
        {pendiente ? "Enviando…" : "Crear mi cuenta"}
      </button>
      {estado.status === "error" && !estado.fieldErrors ? <Aviso estado={estado} /> : null}
    </form>
  );
}
