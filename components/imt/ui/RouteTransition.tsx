"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Module-level state shared by every mount in this tab.
let hasMounted = false;
const SHOW_CURTAIN = false;
let listening = false;
const lastPress = { x: 0, y: 0, at: 0 };

function trackPresses() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastPress.x = e.clientX;
      lastPress.y = e.clientY;
      lastPress.at = performance.now();
    },
    { passive: true, capture: true },
  );
}

type Curtain = { host: Element | null; origin: CSSProperties };

/**
 * Page transition, remounted by app/(public)/template.tsx on every
 * navigation: a lime wave expands from the point that was clicked, a dark
 * veil follows it, the brand glyph draws itself inside a rotating ring while
 * a dash streaks across, then everything fades to reveal the new page.
 *
 * Pure CSS animations, no timers or pending state: navigating fast simply
 * unmounts the previous curtain and mounts a fresh one, so nothing can get
 * stuck or desync. Skipped on the very first load. The page wrapper only
 * animates opacity with `backwards` fill, so no transform or stacking
 * context is left behind (position: sticky keeps working).
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const [curtain] = useState<Curtain | null>(() => {
    // Server render and hydration always match (null). Only later mounts in
    // the browser (client-side navigations) animate. Reading, not writing,
    // the flag here keeps StrictMode's double invocation harmless.
    if (typeof window === "undefined" || !hasMounted) return null;
    const recent = performance.now() - lastPress.at < 1500;
    const x = recent ? lastPress.x : window.innerWidth / 2;
    const y = recent ? lastPress.y : window.innerHeight / 2;
    // Radius that covers the farthest corner from the origin.
    const reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 40;
    return {
      // Portal into the themed shell so the curtain sits above the sticky
      // header instead of inside <main>'s stacking context.
      host: document.querySelector('[data-theme="imt"]'),
      origin: {
        "--route-x": `${Math.round(x)}px`,
        "--route-y": `${Math.round(y)}px`,
        "--route-r": `${Math.round(reach)}px`,
      } as CSSProperties,
    };
  });

  useEffect(() => {
    hasMounted = true;
    trackPresses();
  }, []);

  const overlay = curtain ? (
    <div aria-hidden="true" className="imt-route-curtain" style={curtain.origin}>
      <span className="imt-route-wave" />
      <span className="imt-route-veil" />
      <span className="imt-route-streak" />
      <span className="imt-route-mark">
        <svg viewBox="0 0 120 120" className="imt-route-ring">
          <circle cx="60" cy="60" r="52" className="imt-route-track" />
          <circle cx="60" cy="60" r="52" pathLength={100} className="imt-route-dash" />
          <circle cx="60" cy="60" r="42" pathLength={100} className="imt-route-dots" />
        </svg>
        <svg viewBox="0 0 32 32" className="imt-route-glyph">
          <path d="M9 22V10h4l3 6 3-6h4v12" pathLength={1} />
          <circle cx="9" cy="22" r="1.8" />
          <circle cx="23" cy="22" r="1.8" />
        </svg>
      </span>
    </div>
  ) : null;

  return (
    <>
      {/* The cover + spinning ring now lives in NavigationLoader (shown while the
          next page loads); this component only fades the new content in. */}
      {SHOW_CURTAIN && overlay ? (curtain?.host ? createPortal(overlay, curtain.host) : overlay) : null}
      <div>{children}</div>
    </>
  );
}
