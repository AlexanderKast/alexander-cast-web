"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { solicitarRegistro } from "@/app/comunidad/actions";
import { Aviso, Campo, INICIAL, botonCls, inputCls } from "./ui";

export interface IntencionForm {
  /** Programa de interés (slug); el servidor lo valida contra el catálogo. */
  programa: string | null;
  oferta: string | null;
  /** Llegó pidiendo un asesor. */
  asesor: boolean;
  origen: "web" | "stand";
  utm: Record<string, string>;
}

/**
 * Crear cuenta de la plataforma (no es una compra ni una inscripción). El programa de interés y el origen viajan
 * con el registro como DATOS de navegación; nunca deciden precio ni acceso. La privacidad es obligatoria y NO viene
 * marcada; el marketing es opcional y tampoco; el contacto de un asesor es una autorización aparte por canal.
 */
export function FormRegistro({ intencion, nombrePrograma }: { intencion: IntencionForm; nombrePrograma: string | null }) {
  // Cambiar la clave desmonta el formulario: «pedir otro enlace» vuelve a un formulario limpio.
  const [intento, setIntento] = useState(0);
  return (
    <FormularioRegistro
      key={intento}
      intencion={intencion}
      nombrePrograma={nombrePrograma}
      onOtroEnlace={() => setIntento((n) => n + 1)}
    />
  );
}

function FormularioRegistro({
  intencion,
  nombrePrograma,
  onOtroEnlace,
}: {
  intencion: IntencionForm;
  nombrePrograma: string | null;
  onOtroEnlace: () => void;
}) {
  const [estado, accion, pendiente] = useActionState(solicitarRegistro, INICIAL);
  const [canal, setCanal] = useState<"whatsapp" | "correo">("whatsapp");
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
      {intencion.programa ? <input type="hidden" name="programa" value={intencion.programa} /> : null}
      {intencion.oferta ? <input type="hidden" name="oferta" value={intencion.oferta} /> : null}
      {intencion.asesor ? <input type="hidden" name="asesor" value="1" /> : null}
      <input type="hidden" name="o" value={intencion.origen} />
      {Object.entries(intencion.utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {nombrePrograma ? (
        <p className="mia-alert mia-alert-ok text-sm">
          {intencion.asesor
            ? `Después de confirmar tu correo, un asesor te contactará sobre ${nombrePrograma}.`
            : `Después de confirmar tu correo vuelves a ${nombrePrograma} dentro de la plataforma.`}
        </p>
      ) : null}

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
      <Campo etiqueta={intencion.asesor && canal === "whatsapp" ? "WhatsApp" : "WhatsApp (opcional)"} error={errores.whatsapp}>
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required={intencion.asesor && canal === "whatsapp"}
          placeholder="+57 300 000 0000"
          aria-invalid={errores.whatsapp ? true : undefined}
          className={inputCls}
        />
      </Campo>

      {intencion.asesor ? (
        <fieldset className="space-y-3">
          <legend className="mia-label">¿Cómo prefieres que te contacten?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["whatsapp", "correo"] as const).map((c) => (
              <label key={c} className="cursor-pointer">
                <input
                  type="radio"
                  name="canal"
                  value={c}
                  checked={canal === c}
                  onChange={() => setCanal(c)}
                  className="sr-only"
                />
                <span className="mia-choice">{c === "whatsapp" ? "WhatsApp" : "Correo"}</span>
              </label>
            ))}
          </div>
          {errores.canal ? <p role="alert" className="mia-error">{errores.canal}</p> : null}
          <label className="flex items-start gap-3 text-sm leading-snug">
            <input
              type="checkbox"
              name="consentimiento_contacto"
              required
              aria-invalid={errores.consentimiento_contacto ? true : undefined}
              className="mt-0.5 size-5 shrink-0 accent-[#65a30d]"
            />
            <span>Autorizo que un asesor me contacte por el canal elegido para hablar de este programa.</span>
          </label>
          {errores.consentimiento_contacto ? (
            <p role="alert" className="mia-error">
              {errores.consentimiento_contacto}
            </p>
          ) : null}
        </fieldset>
      ) : null}

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
            Quiero recibir novedades y promociones. <span className="mia-muted">(Opcional)</span>
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
