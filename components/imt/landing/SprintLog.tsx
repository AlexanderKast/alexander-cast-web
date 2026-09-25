"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { SPRINT_POOL } from "@/content/imt";
import { cn } from "@/lib/utils";

type Entry = { id: number; sprint: number; task: string; state: "running" | "done" };

const VISIBLE = 5;
const BUILD_MS = 1300;
const AUTO_MS = 3200;

function initialEntries(): Entry[] {
  return SPRINT_POOL.slice(0, VISIBLE).map((task, i) => ({ id: i, sprint: 4 + i, task, state: "done" }));
}

/**
 * Interactive sprint log (illustrative tasks only). Press "Lanzar sprint" to
 * push the next task: it shows up "en construcción" and moves to
 * "en producción". It also advances on its own while visible, until the
 * visitor takes over.
 */
export function SprintLog() {
  const ref = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  // Only announce new entries once the visitor drives the log (auto-play would spam screen readers).
  const [announce, setAnnounce] = useState(false);
  const busyRef = useRef(false);
  const nextIndex = useRef(VISIBLE);
  const userDriven = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const launch = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const task = SPRINT_POOL[nextIndex.current % SPRINT_POOL.length];
    nextIndex.current += 1;
    setEntries((prev) => {
      const last = prev[prev.length - 1];
      const entry: Entry = { id: (last?.id ?? 0) + 1, sprint: (last?.sprint ?? 0) + 1, task, state: "running" };
      return [...prev, entry].slice(-VISIBLE);
    });
    timers.current.push(
      setTimeout(() => {
        setEntries((prev) => prev.map((e, i) => (i === prev.length - 1 ? { ...e, state: "done" } : e)));
        busyRef.current = false;
        setBusy(false);
      }, BUILD_MS),
    );
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([entry]) => {
      clearInterval(interval);
      if (entry?.isIntersecting && !userDriven.current) {
        interval = setInterval(() => {
          if (!userDriven.current && !document.hidden) launch();
        }, AUTO_MS);
      }
    });
    io.observe(el);
    const pending = timers.current;
    return () => {
      io.disconnect();
      clearInterval(interval);
      pending.forEach(clearTimeout);
    };
    // launch only touches refs and state setters, so it is safe to capture once.
  }, []);

  return (
    <div ref={ref} className="imt-card overflow-hidden shadow-[0_30px_90px_-40px_rgba(163,230,53,0.5)]">
      <div className="flex items-center justify-between gap-3 border-b border-imt-border px-5 py-3">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#3a5a1f]" />
          <span className="size-2.5 rounded-full bg-[#3a5a1f]" />
          <span className="size-2.5 rounded-full bg-imt-accent" />
        </div>
        <span className="font-imt-mono text-xs text-imt-muted">sprints.log · ejemplo ilustrativo</span>
      </div>

      <ol
        className="space-y-1 p-3 font-imt-mono text-[12.5px] leading-relaxed sm:p-5 sm:text-[13px]"
        aria-live={announce ? "polite" : "off"}
      >
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              "grid animate-in grid-cols-[auto_1fr] gap-x-3 rounded-lg px-2 py-2 transition-colors duration-700 fade-in slide-in-from-bottom-2 motion-reduce:slide-in-from-bottom-0 sm:grid-cols-[auto_1fr_auto]",
              "[animation-duration:600ms] [animation-timing-function:cubic-bezier(0.22,1,0.36,1)]",
              entry.state === "running" ? "bg-imt-elev" : "bg-transparent",
            )}
          >
            <span className="text-imt-muted">Sprint {String(entry.sprint).padStart(2, "0")}</span>
            <span className="min-w-0 break-words text-imt-text">{entry.task}</span>
            <span
              className={cn(
                "col-start-2 transition-colors duration-500 sm:col-start-auto",
                entry.state === "running" ? "animate-pulse text-imt-muted motion-reduce:animate-none" : "text-imt-accent",
              )}
            >
              {entry.state === "running" ? "▸ en construcción…" : "✓ en producción"}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-imt-border px-4 py-3 sm:px-5">
        <span className="flex items-center gap-2 font-imt-mono text-xs text-imt-muted">
          <span className="text-imt-accent">$</span> próxima entrega: viernes
          <span className="imt-caret inline-block h-3.5 w-1.5 bg-imt-accent" aria-hidden="true" />
        </span>
        <button
          type="button"
          onClick={() => {
            userDriven.current = true;
            setAnnounce(true);
            launch();
          }}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-imt-accent px-5 py-2 text-sm font-semibold text-imt-bg transition-[opacity,transform] duration-300 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-imt-accent active:scale-95 disabled:opacity-50"
        >
          <Play className="size-3.5" aria-hidden />
          Lanzar sprint
        </button>
      </div>
    </div>
  );
}
