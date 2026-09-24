import Link from "next/link";
import { site } from "@/content/site";
import { diagnosticoHref, NAV_ITEMS } from "@/content/imt";
import { BrandMark } from "./BrandMark";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.5 0h4.37v1.92h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.02 5.42 6.94V22h-4.56v-6.16c0-1.47-.03-3.36-2.05-3.36-2.05 0-2.36 1.6-2.36 3.25V22H7.72V8z" />
    </svg>
  );
}

const SOCIAL = [
  { label: `Instagram ${site.social.instagram.handle}`, href: site.social.instagram.url, Icon: InstagramIcon },
  { label: "LinkedIn", href: site.social.linkedin.url, Icon: LinkedinIcon },
];

const LEGAL = [
  { label: "Política de privacidad", href: "/legal/privacidad" },
  { label: "Términos", href: "/legal/terminos" },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-imt-border bg-imt-bg">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
        <div>
          <BrandMark />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-imt-muted">
            Alexander Cast · IA Master Tech — Desarrollo &amp; Automatización · Medellín, Colombia
          </p>
          <ul className="mt-6 flex gap-3">
            {SOCIAL.map(({ label, href, Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-imt-border text-imt-muted transition-colors hover:border-imt-accent hover:text-imt-accent"
                >
                  <Icon />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Secciones y legal" className="flex flex-col gap-3 text-sm md:items-end">
          <Link href={diagnosticoHref()} className="font-medium text-imt-accent transition-colors hover:text-imt-text">
            Agenda tu diagnóstico
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="text-imt-muted transition-colors hover:text-imt-text">
              {item.label}
            </Link>
          ))}
          {LEGAL.map((item) => (
            <Link key={item.href} href={item.href} className="text-imt-muted transition-colors hover:text-imt-text">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-imt-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-6 font-imt-mono text-xs uppercase tracking-[0.14em] text-imt-muted sm:px-6 lg:px-8">
          © 2026 Alexander Cast · IA Master Tech
        </p>
      </div>
    </footer>
  );
}
