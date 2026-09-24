import Link from "next/link";
import { cn } from "@/lib/utils";

/** Circuit-node glyph + "IA Master Tech" wordmark, endorsed by Alexander Cast. */
export function BrandMark({ className, showEndorsement = true }: { className?: string; showEndorsement?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3 rounded-lg", className)} aria-label="IA Master Tech — inicio">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="9" className="fill-imt-elev stroke-imt-border-solid" strokeWidth="1.5" />
        <path d="M9 22V10h4l3 6 3-6h4v12" fill="none" className="stroke-imt-cyan" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="9" cy="22" r="1.8" className="fill-imt-cyan" />
        <circle cx="23" cy="22" r="1.8" className="fill-imt-cyan" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-imt-display text-[17px] font-bold tracking-tight text-imt-text">IA Master Tech</span>
        {showEndorsement ? (
          <span className="mt-1 font-imt-mono text-[10px] uppercase tracking-[0.18em] text-imt-muted">
            by Alexander Cast
          </span>
        ) : null}
      </span>
    </Link>
  );
}
