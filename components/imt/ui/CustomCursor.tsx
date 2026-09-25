"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='button'], [role='slider'], [role='tab'], select, label, summary, [data-cursor]";
const TEXT_FIELD =
  "input:not([type='range']):not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit']), textarea, [contenteditable='true'], [contenteditable='']";

/**
 * Desktop-only cursor: a dot that follows exactly and a ring that trails it
 * with a frame-rate independent ease. The ring grows over interactive
 * elements, shrinks over text fields (so the caret stays visible) and
 * squeezes on press. Both layers are pointer-events: none and the native
 * cursor stays visible, so selection, inputs and dragging are untouched and
 * nothing breaks if this fails. Not mounted on touch / coarse pointers.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;

    const gentle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let frame = 0;
    let last = 0;
    let visible = false;
    let hover = "";

    const loop = (time: number) => {
      const dt = last ? Math.min(64, time - last) : 16.7;
      last = time;
      // ~0.2 per 60 Hz frame, same feel on 120/144 Hz screens.
      const k = gentle ? 1 : 1 - Math.pow(1 - 0.2, dt / 16.7);
      rx += (x - rx) * k;
      ry += (y - ry) * k;
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.2) {
        frame = requestAnimationFrame(loop);
      } else {
        frame = 0;
        last = 0;
      }
    };

    const setHover = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      const next = el?.closest(TEXT_FIELD) ? "text" : el?.closest(INTERACTIVE) ? "true" : "false";
      if (next !== hover) {
        hover = next;
        ring.dataset.hover = next;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!visible) {
        visible = true;
        rx = x;
        ry = y;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
      setHover(e.target);
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") ring.dataset.pressed = "true";
    };
    const onUp = () => {
      delete ring.dataset.pressed;
    };
    const onHide = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
      delete ring.dataset.pressed;
    };
    // Mouse over an element that just appeared (menus, modals) without moving.
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "mouse") setHover(e.target);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onHide);
    window.addEventListener("blur", onHide);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onHide);
      window.removeEventListener("blur", onHide);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} aria-hidden="true" className="imt-cursor imt-cursor-ring opacity-0" />
      <div ref={dotRef} aria-hidden="true" className="imt-cursor imt-cursor-dot opacity-0" />
    </>
  );
}
