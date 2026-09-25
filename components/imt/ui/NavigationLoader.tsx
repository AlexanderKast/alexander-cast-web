"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "covering" | "revealing";
type Mode = "dash" | "circle";

// Desktop: a lime dash + sliding panel. Phones: the circle wave, tuned light.
const TIMING: Record<Mode, { minVisible: number; reveal: number }> = {
  dash: { minVisible: 380, reveal: 520 },
  circle: { minVisible: 250, reveal: 380 },
};
const FAILSAFE_MS = 6000; // never leave the screen covered

/**
 * Navigation loader: on click of an internal link, a lime wave expands from
 * the click point and a ring with the brand glyph spins WHILE the next page
 * loads; when the new route renders, the veil opens to reveal it.
 *
 * Robust under fast navigation: a new click while covering just keeps it
 * covered, a click while revealing re-covers, every timer is cleared on
 * phase change, and a failsafe always uncovers after 6 s.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [origin, setOrigin] = useState<CSSProperties>({});
  const [mode, setMode] = useState<Mode>("circle");
  const modeRef = useRef<Mode>("circle");
  const startedAt = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastPath = useRef(pathname);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const go = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const reveal = () => {
    if (phaseRef.current !== "covering") return;
    clearTimers();
    const timing = TIMING[modeRef.current];
    const wait = Math.max(0, timing.minVisible - (performance.now() - startedAt.current));
    timers.current.push(
      setTimeout(() => {
        go("revealing");
        timers.current.push(setTimeout(() => go("idle"), timing.reveal));
      }, wait),
    );
  };

  // Start covering on internal link clicks and on back/forward.
  useEffect(() => {
    const cover = (x: number, y: number) => {
      clearTimers();
      const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;
      if (phaseRef.current === "idle") {
        const next: Mode = matchMedia("(min-width: 1024px) and (pointer: fine)").matches ? "dash" : "circle";
        modeRef.current = next;
        setMode(next);
      }
      setOrigin({
        "--nav-x": `${Math.round(x)}px`,
        "--nav-y": `${Math.round(y)}px`,
        "--nav-r": `${Math.round(reach)}px`,
      } as CSSProperties);
      if (phaseRef.current !== "covering") startedAt.current = performance.now();
      go("covering");
      timers.current.push(setTimeout(() => go("idle"), FAILSAFE_MS));
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      cover(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
    };
    const onPop = () => cover(innerWidth / 2, innerHeight / 2);

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
      clearTimers();
    };
  }, []);

  // The new route rendered: open the veil.
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    reveal();
    // reveal only reads refs and schedules state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (phase === "idle") return null;

  const mark = (
    <span className="imt-nav-mark">
      <svg viewBox="0 0 120 120" className="imt-nav-ring">
        <circle cx="60" cy="60" r="52" className="imt-nav-track" />
        <circle cx="60" cy="60" r="52" pathLength={100} className="imt-nav-dash" />
      </svg>
      <svg viewBox="0 0 32 32" className="imt-nav-glyph">
        <path d="M9 22V10h4l3 6 3-6h4v12" />
        <circle cx="9" cy="22" r="1.8" />
        <circle cx="23" cy="22" r="1.8" />
      </svg>
    </span>
  );

  return (
    <div aria-hidden="true" className="imt-nav-loader" data-phase={phase} data-mode={mode} style={origin}>
      {mode === "dash" ? (
        <>
          <span className="imt-nav-panel" />
          <span className="imt-nav-bar" />
          <span className="imt-nav-bar imt-nav-bar-thin" />
        </>
      ) : (
        <>
          <span className="imt-nav-dot imt-nav-dot-wave" />
          <span className="imt-nav-dot imt-nav-dot-veil" />
        </>
      )}
      {mark}
    </div>
  );
}
