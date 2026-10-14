"use client";

import { useState } from "react";
import { botonSecundarioCls } from "@/components/comunidad/ui";

/** Abre el portal de facturación de Stripe (tarjeta y facturas). Stripe maneja los datos de la tarjeta. */
export function BotonFacturacion() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/facturacion", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.assign(json.url);
        return;
      }
      setError(json.error ?? "No pudimos abrir tu facturación. Intenta de nuevo.");
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    }
    setCargando(false);
  }

  return (
    <div>
      <button type="button" onClick={abrir} disabled={cargando} className={botonSecundarioCls}>
        {cargando ? "Abriendo…" : "Gestionar tarjeta y facturas"}
      </button>
      {error ? (
        <p role="alert" className="mia-error mt-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
