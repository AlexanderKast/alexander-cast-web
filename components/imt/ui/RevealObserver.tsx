"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "[data-reveal]:not([data-revealed])";
/** Min gap between safety sweeps while scrolling. */
const SWEEP_MS = 120;

/**
 * One IntersectionObserver for every `[data-reveal]` element on the page, so
 * sections can stay server components. Re-scans on navigation and when new
 * nodes are added (e.g. a form swapping to its success state).
 *
 * Never leaves content invisible:
 * - elements already in view (or above it) when scanned reveal right away;
 * - a throttled sweep on scroll / hash jumps / bfcache restore reveals
 *   anything the observer skipped (fast flings jump elements from below the
 *   viewport to above it without ever "intersecting");
 * - without IntersectionObserver everything is revealed at once;
 * - if this never hydrates, reveal-bootstrap.ts disarms the hidden state.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-reveal-ready", "");

    const reveal = (el: Element) => el.setAttribute("data-revealed", "true");

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(SELECTOR).forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Reveal when visible, or when it is already above the viewport.
          if (entry.isIntersecting || entry.boundingClientRect.bottom <= 0) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      // threshold 0: very tall elements still count as soon as they peek in.
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );

    /** Reveals anything whose top is above the bottom of the viewport. */
    const sweep = () => {
      const limit = window.innerHeight;
      document.querySelectorAll(SELECTOR).forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < limit && (rect.width > 0 || rect.height > 0)) {
          reveal(el);
          io.unobserve(el);
        }
      });
    };

    let scanFrame = 0;
    const scan = () => {
      scanFrame = 0;
      document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    };
    const scheduleScan = () => {
      if (!scanFrame) scanFrame = requestAnimationFrame(scan);
    };

    let lastSweep = 0;
    let sweepTimer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const now = performance.now();
      clearTimeout(sweepTimer);
      if (now - lastSweep > SWEEP_MS) {
        lastSweep = now;
        sweep();
      }
      // Trailing sweep once scrolling settles (covers the last fling).
      sweepTimer = setTimeout(sweep, SWEEP_MS * 2);
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) sweep();
    };

    scan();

    const mo = new MutationObserver(scheduleScan);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", sweep);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(scanFrame);
      clearTimeout(sweepTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", sweep);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [pathname]);

  return null;
}
