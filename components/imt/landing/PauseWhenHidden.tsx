"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sets data-paused="true" while the wrapper is off screen or the tab is
 * hidden, so CSS animations inside (circuit pulses, carets) stop repainting.
 */
export function PauseWhenHidden({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = true;
    const update = () => el.setAttribute("data-paused", String(!inView || document.hidden));

    const io = new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting);
      update();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
