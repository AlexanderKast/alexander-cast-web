import Link from "next/link";
import type { SVGProps } from "react";

import { cn } from "@/lib/utils";
import { site } from "@/content/site";

type Variant = "header" | "footer";

type SocialLinksProps = {
  variant?: Variant;
  className?: string;
};

type IconProps = SVGProps<SVGSVGElement>;

function InstagramIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.5 3h-2.8v11.6a2.6 2.6 0 1 1-2.6-2.6h.4V9.2a5.4 5.4 0 1 0 5.3 5.4V9.1a6.4 6.4 0 0 0 3.7 1.2V7.5a3.7 3.7 0 0 1-3.7-3.7 3.5 3.5 0 0 1-.3-.8Z" />
    </svg>
  );
}

function YoutubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.5 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-3.8 31 31 0 0 0-.5-3.8ZM10 15.3V8.7l5.2 3.3Z" />
    </svg>
  );
}

function LinkedinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4v11H3v-11Zm6 0h3.8v1.5h.1a4.2 4.2 0 0 1 3.8-2c4 0 4.8 2.6 4.8 6v5.5h-4v-4.9c0-1.2 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5v5H9v-11Z" />
    </svg>
  );
}

function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.5 3h3.3l-7.2 8.2 8.5 11.3h-6.7l-5.2-6.9L4.3 22.5H1l7.7-8.8L.5 3h6.8l4.7 6.3L17.5 3Zm-1.1 17.5h1.8L7.7 4.7H5.8L16.4 20.5Z" />
    </svg>
  );
}

const links = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, url: site.social.instagram.url },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedinIcon, url: site.social.linkedin.url },
] as const;

export function SocialLinks({ variant = "footer", className }: SocialLinksProps) {
  const base =
    variant === "header"
      ? "size-8 rounded-md border border-white/10 text-white/70 hover:text-amber-400 hover:border-amber-400/50"
      : "size-9 rounded-lg border border-white/10 text-white/60 hover:text-amber-400 hover:border-amber-400/40";

  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {links.map(({ key, label, Icon, url }) => (
        <li key={key}>
          <Link
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Abrir perfil en ${label}`}
            className={cn(
              "inline-flex items-center justify-center transition-colors",
              base,
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
