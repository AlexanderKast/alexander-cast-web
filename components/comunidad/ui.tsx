import type { ReactNode } from "react";
import type { EstadoForm } from "@/app/comunidad/actions";

export const INICIAL: EstadoForm = { status: "idle" };

/** Campo de formulario táctil: 48 px de alto mínimo, pensado para el celular en el stand. */
export const inputCls =
  "w-full min-h-12 rounded-xl border border-line-strong bg-surface-1 px-4 py-3 text-base text-foreground " +
  "placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 " +
  "aria-[invalid=true]:border-destructive";

export const botonCls =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-6 py-3 text-base font-semibold " +
  "text-black transition-opacity hover:opacity-90 disabled:opacity-50";

export const botonSecundarioCls =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-line-strong px-4 py-2 text-sm " +
  "font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50";

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
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {etiqueta}
      </span>
      {children}
      {error ? <span className="mt-1 block text-sm text-destructive">{error}</span> : null}
    </label>
  );
}

export function Aviso({ estado }: { estado: EstadoForm }) {
  if (estado.status === "idle") return null;
  const ok = estado.status === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={
        "rounded-xl border px-4 py-3 text-sm " +
        (ok
          ? "border-gold/40 bg-gold/10 text-foreground"
          : "border-destructive/40 bg-destructive/10 text-destructive")
      }
    >
      <p>{estado.message}</p>
      {estado.detalle?.length ? (
        <ul className="mt-2 max-h-48 list-disc space-y-0.5 overflow-auto pl-5 text-xs opacity-90">
          {estado.detalle.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
