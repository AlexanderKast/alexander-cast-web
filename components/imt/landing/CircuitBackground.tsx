import type { CSSProperties } from "react";

/*
 * Lightweight circuit board: static traces + a few light pulses travelling
 * along them (stroke-dashoffset, CSS only). Pulses are hidden with
 * prefers-reduced-motion and paused off screen by PauseWhenHidden.
 */

const TRACES = [
  "M0 180H340L400 240H700L760 180H1100",
  "M1440 120H1180L1120 180V360L1180 420H1440",
  "M0 560H260L320 500H620L680 560V800",
  "M900 800V620L960 560H1440",
  "M540 0V120L600 180",
  "M220 800V660L280 600H440",
  "M1260 0V80L1320 140H1440",
  "M760 180V420L820 480H1000L1060 420H1180",
];

const PULSES: { d: string; dur: string; delay: string }[] = [
  { d: TRACES[0], dur: "7s", delay: "0s" },
  { d: TRACES[1], dur: "8s", delay: "1.5s" },
  { d: TRACES[2], dur: "9s", delay: "3s" },
  { d: TRACES[3], dur: "6.5s", delay: "0.8s" },
  { d: TRACES[7], dur: "7.5s", delay: "4s" },
  { d: TRACES[5], dur: "6s", delay: "2.2s" },
];

const NODES: [number, number][] = [
  [340, 180],
  [700, 240],
  [1100, 180],
  [1120, 360],
  [620, 500],
  [960, 560],
  [440, 600],
  [1000, 480],
  [600, 180],
  [1320, 140],
];

export function CircuitBackground() {
  return (
    <svg
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full [mask-image:radial-gradient(ellipse_75%_70%_at_50%_40%,#000_40%,transparent_100%)]"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="#10263a" strokeWidth="1.5">
        {TRACES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round">
        {PULSES.map((p) => (
          <path
            key={p.d + p.delay}
            d={p.d}
            pathLength={1000}
            className="imt-pulse"
            style={{ "--dur": p.dur, "--delay": p.delay } as CSSProperties}
          />
        ))}
      </g>
      <g fill="#0a111b" stroke="#1e4a66" strokeWidth="1.5">
        {NODES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />
        ))}
      </g>
    </svg>
  );
}
