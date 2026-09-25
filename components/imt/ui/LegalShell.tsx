import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const LEGAL_PAGES = [
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/terminos", label: "Términos" },
];

/**
 * Presentation for the legal pages: header, tabs between documents and a
 * readable card. Only styles the existing legal text; never rewrites it.
 */
export function LegalShell({ current, children }: { current: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <nav aria-label="Documentos legales" className="imt-segment" data-reveal="">
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            aria-current={current === page.href ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              current === page.href ? "bg-imt-accent text-imt-bg" : "text-imt-muted hover:text-imt-text",
            )}
          >
            {page.label}
          </Link>
        ))}
      </nav>

      <article
        data-reveal=""
        className={cn(
          "relative mt-8 overflow-hidden rounded-[2rem] border border-imt-border bg-imt-bg/85 p-7 backdrop-blur sm:p-12",
          "prose prose-invert prose-lg max-w-none",
          "prose-headings:font-imt-display prose-headings:tracking-tight prose-headings:text-imt-text",
          "prose-h1:mb-2 prose-h1:text-4xl sm:prose-h1:text-6xl prose-h1:font-bold",
          "prose-h2:mt-12 prose-h2:border-t prose-h2:border-imt-border prose-h2:pt-10 prose-h2:text-2xl",
          "prose-p:text-imt-muted prose-p:leading-relaxed prose-li:text-imt-muted prose-li:marker:text-imt-accent",
          "prose-strong:text-imt-text prose-a:text-imt-accent prose-a:no-underline hover:prose-a:underline",
        )}
      >
        <div aria-hidden="true" className="imt-dots pointer-events-none absolute inset-x-0 top-0 h-64 opacity-50" />
        <div className="relative">{children}</div>
      </article>
    </div>
  );
}
