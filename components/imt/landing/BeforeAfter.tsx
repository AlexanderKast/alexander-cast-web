"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Check, ChevronsLeftRight, X } from "lucide-react";
import { BEFORE_AFTER } from "@/content/imt";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";

function Panel({ variant }: { variant: "operar" | "escalar" }) {
  const escalar = variant === "escalar";
  return (
    <div className={escalar ? "bg-imt-surface" : "bg-[#0b0c0b]"}>
      <div className="flex items-center justify-between border-b border-imt-border px-6 py-4 sm:px-10">
        <span
          className={
            escalar
              ? "font-imt-mono text-sm uppercase tracking-[0.22em] text-imt-accent"
              : "font-imt-mono text-sm uppercase tracking-[0.22em] text-imt-muted"
          }
        >
          {escalar ? "Escalar · con sistemas" : "Operar · a mano"}
        </span>
      </div>
      <ul className="divide-y divide-imt-border">
        {BEFORE_AFTER.map((row, i) => (
          <li key={row.operar} className="flex min-h-[88px] items-center gap-4 px-6 py-5 sm:px-10">
            <span
              className={
                escalar
                  ? "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-imt-accent text-imt-bg"
                  : "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#5b3a3a] text-[#f0a3a3]"
              }
            >
              {escalar ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <X className="size-4" aria-hidden />}
            </span>
            <span
              className={escalar ? "text-lg font-medium text-imt-text" : "text-lg text-imt-muted"}
              style={escalar ? undefined : { transform: `rotate(${i % 2 ? -0.6 : 0.5}deg)` }}
            >
              {escalar ? row.escalar : row.operar}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Draggable before/after comparison: "Operar" on the left, "Escalar" revealed
 * from the right. Pointer (mouse / touch) and keyboard (arrows, Home, End).
 * Plays a one-time hint sweep when it first scrolls into view.
 */
export function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const sweep = (now: number) => {
          if (dragging.current) return;
          const t = Math.min((now - start) / 2200, 1);
          setPos(50 + Math.sin(t * Math.PI * 2) * 22);
          if (t < 1) raf = requestAnimationFrame(sweep);
        };
        raf = requestAnimationFrame(sweep);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const moveTo = (clientX: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next =
      e.key === "ArrowLeft" ? pos - 5 : e.key === "ArrowRight" ? pos + 5 : e.key === "Home" ? 0 : e.key === "End" ? 100 : null;
    if (next === null) return;
    e.preventDefault();
    dragging.current = true;
    setPos(Math.min(100, Math.max(0, next)));
  };

  return (
    <section aria-labelledby="antes-despues-title" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <header data-reveal="" className="max-w-3xl">
          <Eyebrow>Arrastra y compara</Eyebrow>
          <h2 id="antes-despues-title" className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
            El mismo negocio. <span className="imt-text-glow">Otra forma de operar.</span>
          </h2>
        </header>

        <div
          ref={boxRef}
          data-reveal=""
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative mt-12 cursor-ew-resize select-none overflow-hidden rounded-[2rem] border border-imt-border [touch-action:pan-y]"
        >
          <Panel variant="operar" />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} aria-hidden="true">
            <Panel variant="escalar" />
          </div>

          <div
            role="slider"
            tabIndex={0}
            aria-label="Comparar operar a mano con escalar con sistemas"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={pos < 50 ? "Más escalar" : "Más operar"}
            onKeyDown={onKeyDown}
            className="absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-imt-accent shadow-[0_0_18px_rgba(163,230,53,0.9)]"
            style={{ left: `${pos}%` }}
          >
            <span className="absolute left-1/2 top-1/2 inline-flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-imt-accent bg-imt-bg text-imt-accent">
              <ChevronsLeftRight className="size-5" aria-hidden />
            </span>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-imt-muted">Desliza la línea para ver la diferencia.</p>
      </div>
    </section>
  );
}
