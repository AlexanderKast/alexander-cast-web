"use client";

import { useState, type ReactNode } from "react";

// Module-level: true after the first page has mounted in this tab.
let hasMounted = false;

/**
 * Page transition, remounted by app/(public)/template.tsx on every
 * navigation. Pure CSS animations, no timers or pending state: navigating
 * fast just unmounts the previous curtain, so nothing can get stuck.
 * Skipped on the very first load so it never delays the first paint.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const [animate] = useState(() => {
    // Server render and hydration always match (false); only client-side
    // navigations (later mounts in the browser) animate.
    if (typeof window === "undefined") return false;
    const isNavigation = hasMounted;
    hasMounted = true;
    return isNavigation;
  });

  return (
    <>
      {animate ? (
        <div aria-hidden="true" className="imt-route-curtain">
          <span className="imt-route-ring" />
        </div>
      ) : null}
      <div className={animate ? "imt-route-enter" : undefined}>{children}</div>
    </>
  );
}
