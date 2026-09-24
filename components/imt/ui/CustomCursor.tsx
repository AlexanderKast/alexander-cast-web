"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='slider'], input, select, textarea, label, [data-cursor]";

/**
 * Desktop-only cursor: a dot that follows exactly and a ring that trails it
 * and grows over interactive elements. The native cursor stays visible, so
 * nothing breaks if this fails. Hidden on touch devices.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const gentle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let frame = 0;
    let visible = false;

    const loop = () => {
      rx += (x - rx) * (gentle ? 1 : 0.18);
      ry += (y - ry) * (gentle ? 1 : 0.18);
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      frame = Math.abs(x - rx) + Math.abs(y - ry) > 0.2 ? requestAnimationFrame(loop) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
      const target = e.target instanceof Element ? e.target : null;
      ring.dataset.hover = target?.closest(INTERACTIVE) ? "true" : "false";
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} aria-hidden="true" className="imt-cursor imt-cursor-ring opacity-0" />
      <div ref={dotRef} aria-hidden="true" className="imt-cursor imt-cursor-dot opacity-0" />
    </>
  );
}
