"use client";

import { useActionState } from "react";
import { enviarAccesosPendientes, reenviarAcceso } from "@/app/comunidad/actions";
import { Aviso, INICIAL, botonSecundarioCls } from "./ui";

export function BotonReenviar({ userId }: { userId: string }) {
  const [estado, accion, pendiente] = useActionState(reenviarAcceso, INICIAL);
  return (
    <form action={accion} className="inline-flex items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <button type="submit" disabled={pendiente} className={botonSecundarioCls}>
        {pendiente ? "…" : "Enviar acceso"}
      </button>
      {estado.status !== "idle" ? (
        <span
          role="status"
          className={"text-xs " + (estado.status === "ok" ? "text-gold" : "text-destructive")}
        >
          {estado.message}
        </span>
      ) : null}
    </form>
  );
}

export function BotonEnviarPendientes() {
  const [estado, accion, pendiente] = useActionState(enviarAccesosPendientes, INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <button
        type="submit"
        disabled={pendiente}
        onClick={(e) => {
          if (!confirm("Se enviará el acceso a todos los alumnos que aún no han entrado. ¿Continuar?")) {
            e.preventDefault();
          }
        }}
        className={botonSecundarioCls}
      >
        {pendiente ? "Enviando…" : "Enviar acceso a pendientes"}
      </button>
      <Aviso estado={estado} />
    </form>
  );
}
