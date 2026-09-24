/** Circuit trace between sections; draws itself while scrolling into view. */
export function CircuitDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="h-10 w-full sm:h-14"
        style={flip ? { transform: "scaleX(-1)" } : undefined}
      >
        <path d="M0 30H420L450 8H760L790 30H1200" fill="none" stroke="#1a2614" strokeWidth="1.5" />
        <path
          className="imt-divider-trace"
          d="M0 30H420L450 8H760L790 30H1200"
          pathLength={1}
          fill="none"
          stroke="#A3E635"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="450" cy="8" r="4" fill="#A3E635" />
        <circle cx="760" cy="8" r="4" fill="#A3E635" />
      </svg>
    </div>
  );
}
