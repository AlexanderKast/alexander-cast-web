"use client";

import { useEffect, useRef } from "react";

/**
 * Radial glow that follows the pointer inside its parent (desktop only).
 * Moves with transform, throttled to one update per frame. On touch devices
 * or with reduced motion it stays as a static glow.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = ref.current;
    const host = glow?.parentElement;
    if (!glow || !host) return;
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          glow.style.setProperty("--gx", `${x}px`);
          glow.style.setProperty("--gy", `${y}px`);
        });
      }
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 size-[720px] rounded-full [--gx:70vw] [--gy:220px] [transform:translate3d(var(--gx),var(--gy),0)_translate(-50%,-50%)] bg-[radial-gradient(circle,rgba(34,211,238,0.14),rgba(5,8,13,0)_65%)] transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none"
    />
  );
}
