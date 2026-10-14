"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopiarEnlace({ enlace }: { enlace: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el enlace queda visible para copiarlo a mano.
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-xl border border-imt-border bg-imt-bg px-4 py-3 text-sm text-imt-text">
        {enlace}
      </code>
      <button
        type="button"
        onClick={copiar}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-imt-accent px-4 text-sm font-medium text-imt-accent transition-colors hover:bg-imt-accent hover:text-imt-bg"
      >
        {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
