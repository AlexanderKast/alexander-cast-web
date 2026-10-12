import Link from "next/link";

/** Glifo de circuito de IA Master Tech, en versión clara, con la marca del programa. */
export function BrandMark() {
  return (
    <Link href="/comunidad" className="flex items-center gap-3 rounded-lg" aria-label="Master IA 360 — inicio">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="9" fill="#050705" />
        <path
          d="M9 22V10h4l3 6 3-6h4v12"
          fill="none"
          stroke="#A3E635"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx="9" cy="22" r="1.8" fill="#A3E635" />
        <circle cx="23" cy="22" r="1.8" fill="#A3E635" />
      </svg>
      <span className="flex flex-col">
        <span className="mia-brand-name">Master IA 360</span>
        <span className="mia-brand-sub">by IA Master Tech</span>
      </span>
    </Link>
  );
}
