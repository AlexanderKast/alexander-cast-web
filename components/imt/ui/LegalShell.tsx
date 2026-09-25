"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const LEGAL_PAGES = [
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/terminos", label: "Términos" },
];

type Section = { id: string; label: string };

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Typography for the legal text, as descendant utilities (no typography plugin needed).
const DOC = cn(
  "text-base leading-relaxed text-imt-muted sm:text-lg",
  "[&_h1]:text-balance [&_h1]:font-imt-display [&_h1]:text-[2.25rem] [&_h1]:font-bold [&_h1]:leading-[1.02] [&_h1]:tracking-tight [&_h1]:text-imt-text sm:[&_h1]:text-6xl",
  "[&_h1+p]:mt-4 [&_h1+p]:inline-flex [&_h1+p]:flex-wrap [&_h1+p]:gap-x-1 [&_h1+p]:rounded-full [&_h1+p]:border [&_h1+p]:border-imt-border [&_h1+p]:bg-imt-elev [&_h1+p]:px-4 [&_h1+p]:py-1.5 [&_h1+p]:text-sm",
  "[&_h2]:mt-10 [&_h2]:scroll-mt-28 [&_h2]:border-t [&_h2]:border-imt-border [&_h2]:pt-8 [&_h2]:font-imt-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-imt-text sm:[&_h2]:mt-12 sm:[&_h2]:pt-10 sm:[&_h2]:text-2xl",
  "[&_p]:mt-4 [&_p]:text-pretty",
  "[&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:pl-1 [&_li]:marker:text-imt-accent",
  "[&_strong]:font-semibold [&_strong]:text-imt-text [&_em]:text-imt-text",
  "[&_a]:break-words [&_a]:text-imt-accent [&_a]:underline-offset-4 [&_a:hover]:underline [&_a:focus-visible]:rounded [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-imt-accent",
);

/**
 * Presentation for the legal pages: tabs between documents, a reading
 * progress bar, an auto-built index of sections (with scroll-spy) and a
 * readable card. Only styles the existing legal text; never rewrites it.
 */
export function LegalShell({ current, children }: { current: string; children: ReactNode }) {
  const docRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Build the index from the document's H2s (ids are added client-side only).
  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;
    const headings = Array.from(doc.querySelectorAll("h2"));
    const found = headings.map((h, i) => {
      if (!h.id) h.id = slugify(h.textContent ?? "") || `seccion-${i + 1}`;
      return { id: h.id, label: h.textContent ?? "" };
    });
    setSections(found);

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, []);

  // Reading progress through the article.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = docRef.current;
      if (!doc) return;
      const rect = doc.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const read = Math.min(Math.max(-rect.top + window.innerHeight * 0.2, 0), Math.max(total, 1));
      setProgress(total > 0 ? read / total : 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-40 lg:px-8">
      <nav aria-label="Documentos legales" className="imt-segment" data-reveal="">
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            aria-current={current === page.href ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors duration-300",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imt-accent",
              current === page.href ? "bg-imt-accent text-imt-bg" : "text-imt-muted hover:text-imt-text",
            )}
          >
            {page.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-12">
        <article
          data-reveal=""
          className="relative min-w-0 overflow-hidden rounded-3xl border border-imt-border bg-imt-bg/85 p-5 backdrop-blur sm:rounded-[2rem] sm:p-12"
        >
          {/* Reading progress along the top edge of the card. */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-imt-border/60">
            <div
              className="h-full origin-left bg-imt-accent transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
          <div aria-hidden="true" className="imt-dots pointer-events-none absolute inset-x-0 top-0 h-64 opacity-50" />
          <div ref={docRef} className={cn("relative", DOC)}>
            {children}
          </div>
        </article>

        {sections.length > 0 ? (
          <aside
            aria-label="Contenido del documento"
            className="order-first animate-in fade-in duration-700 lg:order-none"
          >
            <details className="group rounded-2xl border border-imt-border bg-imt-bg/85 backdrop-blur lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 font-imt-display text-sm font-semibold text-imt-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imt-accent [&::-webkit-details-marker]:hidden">
                Contenido · {sections.length} secciones
                <span
                  aria-hidden="true"
                  className="text-imt-accent transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <SectionList sections={sections} activeId={activeId} className="px-3 pb-3" />
            </details>
            <div className="sticky top-28 hidden lg:block">
              <p className="font-imt-mono text-xs uppercase tracking-[0.16em] text-imt-accent">Contenido</p>
              <SectionList sections={sections} activeId={activeId} className="mt-4" />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function SectionList({
  sections,
  activeId,
  className,
}: {
  sections: Section[];
  activeId: string | null;
  className?: string;
}) {
  return (
    <ol className={cn("space-y-1 border-l border-imt-border", className)}>
      {sections.map((section) => {
        const active = section.id === activeId;
        return (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active ? "location" : undefined}
              className={cn(
                "-ml-px flex min-h-10 items-center border-l-2 py-1.5 pl-4 text-sm leading-snug transition-colors duration-300",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imt-accent",
                active
                  ? "border-imt-accent text-imt-text"
                  : "border-transparent text-imt-muted hover:border-imt-border-solid hover:text-imt-text",
              )}
            >
              {section.label}
            </a>
          </li>
        );
      })}
    </ol>
  );
}
