import type { ReactNode } from "react";
import type { EstadoForm } from "@/app/comunidad/actions";

export const INICIAL: EstadoForm = { status: "idle" };

/* Las clases viven en app/comunidad/comunidad.css (tema claro de IA Master Tech). */
export const inputCls = "mia-input";
export const botonCls = "mia-btn mia-btn-primary";
export const botonSecundarioCls = "mia-btn mia-btn-secondary mia-btn-sm";

export function Campo({
  etiqueta,
  error,
  children,
}: {
  etiqueta: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mia-label">{etiqueta}</span>
      {children}
      {error ? <span className="mia-error block">{error}</span> : null}
    </label>
  );
}

export function Aviso({ estado }: { estado: EstadoForm }) {
  if (estado.status === "idle") return null;
  const ok = estado.status === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={"mia-alert " + (ok ? "mia-alert-ok" : "mia-alert-error")}
    >
      <p>{estado.message}</p>
      {estado.detalle?.length ? (
        <ul>
          {estado.detalle.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
