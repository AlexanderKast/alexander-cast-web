"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const BASE_SPEED = 40; // px per second when idle
const FRICTION = 2.2; // how fast a fling decays back to the base speed (per second)

/**
 * Infinite marquee you can grab: drag it with mouse or finger, fling it and
 * it keeps the momentum, then eases back to its idle speed. Arrow keys nudge
 * it when focused. The duplicate copy is hidden from assistive tech.
 */
export function DraggableMarquee({
  children,
  label,
  className,
  speed = BASE_SPEED,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  speed?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const state = useRef({ offset: 0, velocity: 0, dragging: false, lastX: 0, lastT: 0, hover: false });

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const gentle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const idle = gentle ? speed * 0.3 : speed;
    let frame = 0;
    let last = performance.now();
    let visible = true;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      const half = track.scrollWidth / 2;
      if (!s.dragging) {
        // Fling momentum decays toward the idle speed (slower on hover).
        const target = s.hover ? idle * 0.25 : idle;
        s.velocity += (target - s.velocity) * Math.min(1, FRICTION * dt);
        s.offset -= s.velocity * dt;
      }
      if (half > 0) {
        s.offset = ((s.offset % half) - half) % half;
      }
      track.style.transform = `translate3d(${s.offset}px, 0, 0)`;
      frame = visible ? requestAnimationFrame(loop) : 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    });
    io.observe(wrap);

    const onDown = (e: PointerEvent) => {
      const s = state.current;
      s.dragging = true;
      s.lastX = e.clientX;
      s.lastT = performance.now();
      s.velocity = 0;
      wrap.setPointerCapture(e.pointerId);
      wrap.dataset.dragging = "true";
    };
    const onMove = (e: PointerEvent) => {
      const s = state.current;
      if (!s.dragging) return;
      const now = performance.now();
      const dx = e.clientX - s.lastX;
      const dt = Math.max(1, now - s.lastT) / 1000;
      s.offset += dx;
      // Velocity in "leftward px/s" to match the idle direction.
      s.velocity = s.velocity * 0.6 + (-dx / dt) * 0.4;
      s.lastX = e.clientX;
      s.lastT = now;
    };
    const onUp = () => {
      const s = state.current;
      if (!s.dragging) return;
      s.dragging = false;
      s.velocity = Math.max(-4000, Math.min(4000, s.velocity));
      wrap.dataset.dragging = "false";
    };
    const onEnter = () => {
      state.current.hover = true;
    };
    const onLeave = () => {
      state.current.hover = false;
    };

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [speed]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    state.current.velocity = e.key === "ArrowRight" ? 900 : -900;
  };

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label={`${label} (arrastra para moverlo)`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "imt-marquee cursor-grab select-none rounded-xl [touch-action:pan-y] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-imt-accent data-[dragging=true]:cursor-grabbing",
        className,
      )}
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
