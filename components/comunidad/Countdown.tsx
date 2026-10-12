"use client";

import { useSyncExternalStore } from "react";

function partes(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return {
    dias: Math.floor(t / 86400),
    horas: Math.floor((t % 86400) / 3600),
    min: Math.floor((t % 3600) / 60),
    seg: t % 60,
  };
}

const suscribir = (aviso: () => void) => {
  const id = setInterval(aviso, 1000);
  return () => clearInterval(id);
};
const ahoraCliente = () => Math.floor(Date.now() / 1000) * 1000;
/** En el servidor (y al hidratar) no hay hora: se pintan guiones y no hay desajuste. */
const ahoraServidor = () => 0;

export function Countdown({ hasta }: { hasta: string }) {
  const ahora = useSyncExternalStore(suscribir, ahoraCliente, ahoraServidor);
  const p = partes(ahora === 0 ? 0 : new Date(hasta).getTime() - ahora);
  const celdas: [string, number][] = [
    ["Días", p.dias],
    ["Horas", p.horas],
    ["Min", p.min],
    ["Seg", p.seg],
  ];

  return (
    <div role="timer" aria-live="off" className="grid grid-cols-4 gap-2">
      {celdas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center">
          <div className="font-[family-name:var(--mia-font-display)] text-2xl font-bold tabular-nums text-[var(--mia-accent)] sm:text-3xl">
            {ahora === 0 ? "--" : String(valor).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--mia-dark-muted)]">{etiqueta}</div>
        </div>
      ))}
    </div>
  );
}
