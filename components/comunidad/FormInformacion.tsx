"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { solicitarInformacion, type EstadoInformacion } from "@/app/comunidad/lead-actions";
import { UTM_CAMPOS } from "@/lib/comunidad/consentimiento";
import { Campo, botonCls, inputCls } from "./ui";

const INICIAL: EstadoInformacion = { status: "idle" };

/**
 * Solicitar información o entrar en la lista de espera. No crea cuenta, pedido
 * ni checkout. La `request_key` se genera al cargar: reenviar el mismo
 * formulario (doble clic, red lenta) no duplica la solicitud.
 */
export function FormInformacion({
  origen,
  utm,
  listaDeEspera,
}: {
  origen: "web" | "stand";
  utm: Record<string, string>;
  listaDeEspera: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(solicitarInformacion, INICIAL);
  // useState inicializador: se genera una sola vez en el cliente por carga del formulario.
  const [requestKey] = useState(() => crypto.randomUUID());
  const evento = useRef(false);
  const errores = estado.status === "error" ? (estado.fieldErrors ?? {}) : {};

  // Evento solo tras éxito REAL del servidor, una vez, sin datos personales.
  useEffect(() => {
    if (estado.status === "ok" && !evento.current) {
      evento.current = true;
      track("lead_submitted", { intencion: estado.intencion });
    }
  }, [estado]);

  if (estado.status === "ok") {
    return (
      <div role="status" className="mia-alert mia-alert-ok space-y-1">
        <p className="font-semibold">Recibimos tu solicitud.</p>
        <p>
          {estado.intencion === "lista_espera"
            ? "Quedaste en la lista de espera. Si se abre un cupo o una nueva cohorte, te contactamos. No es una reserva."
            : "Te contactaremos con la información por los datos que dejaste."}
        </p>
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="request_key" value={requestKey} />
      <input type="hidden" name="o" value={origen} />
      {UTM_CAMPOS.map((c) => (utm[c] ? <input key={c} type="hidden" name={c} value={utm[c]} /> : null))}

      <Campo etiqueta="Nombre" error={errores.nombre}>
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
            Autorizo el tratamiento de mis datos personales para responder esta solicitud, según la{" "}
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
        {pendiente ? "Enviando…" : listaDeEspera ? "Unirme a la lista de espera" : "Solicitar información"}
      </button>
      {estado.status === "error" && !estado.fieldErrors ? (
        <p role="alert" className="mia-alert mia-alert-error">
          {estado.message}
        </p>
      ) : null}
    </form>
  );
}
