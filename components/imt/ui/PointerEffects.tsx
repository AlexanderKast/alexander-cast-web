"use client";

import { useEffect } from "react";

const MAGNET_PX = 8;
const TILT_DEG = 3;

/**
 * Delegated pointer effects for the whole public site (one listener):
 * - `.imt-btn`: magnetic pull toward the cursor.
 * - `[data-tilt]`: subtle 3D tilt.
 * - `[data-spotlight]`: sets --mx / --my for the CSS spotlight.
 * Mouse only (no touch jitter). With prefers-reduced-motion the movement
 * (magnet, tilt) is off but the spotlight, which doesn't move anything,
 * stays. Transforms ease back through the CSS transitions in app/imt.css.
 */
export function PointerEffects() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const canMove = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

    let frame = 0;
    let lastEvent: PointerEvent | null = null;
    const active = new Set<HTMLElement>();

    const reset = (el: HTMLElement) => {
      el.style.transform = "";
      el.style.transitionDelay = "";
      active.delete(el);
    };

    const apply = () => {
      frame = 0;
      const e = lastEvent;
      if (!e) return;
      const target = e.target instanceof Element ? e.target : null;
      const touched = new Set<HTMLElement>();

      // No pull while a mouse button is held (text selection, dragging).
      const button = canMove && e.buttons === 0 ? target?.closest<HTMLElement>(".imt-btn") : null;
      if (button && !button.matches(":disabled, [aria-disabled='true']")) {
        const r = button.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        button.style.transform = `translate(${(dx * MAGNET_PX).toFixed(1)}px, ${(dy * MAGNET_PX * 0.6).toFixed(1)}px)`;
        touched.add(button);
      }

      const tilt = canMove ? target?.closest<HTMLElement>("[data-tilt]") : null;
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transitionDelay = "0ms";
        tilt.style.transform = `perspective(900px) rotateX(${(-py * TILT_DEG).toFixed(2)}deg) rotateY(${(px * TILT_DEG).toFixed(2)}deg)`;
        touched.add(tilt);
      }

      const spot = target?.closest<HTMLElement>("[data-spotlight]");
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${e.clientX - r.left}px`);
        spot.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      for (const el of active) if (!touched.has(el)) reset(el);
      for (const el of touched) active.add(el);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      for (const el of [...active]) reset(el);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, []);

  return null;
}
