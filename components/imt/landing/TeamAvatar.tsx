import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Team photo from /public, or an initials placeholder when the file is not
 * there yet. Checked at build/render time so a missing photo never breaks
 * the build.
 */
export function TeamAvatar({
  photo,
  name,
  initials,
  className,
  sizes = "(min-width: 768px) 240px, 45vw",
}: {
  photo: string;
  name: string;
  initials: string;
  className?: string;
  sizes?: string;
}) {
  const hasPhoto = fs.existsSync(path.join(process.cwd(), "public", photo));

  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-2xl border border-imt-border bg-imt-bg transition-[border-color,box-shadow] duration-500 group-hover:border-imt-accent group-hover:shadow-[0_0_40px_-12px_rgba(163,230,53,0.6)]", className)}>
      {hasPhoto ? (
        <Image src={photo} alt={`Foto de ${name}`} fill sizes={sizes} className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none" />
      ) : (
        <div className="flex size-full items-center justify-center" role="img" aria-label={`${name} (foto pendiente)`}>
          <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden="true">
            <path d="M0 60H70L90 80H200M40 200V140L60 120H120" fill="none" stroke="#1a2614" strokeWidth="2" />
            <circle cx="90" cy="80" r="4" fill="#3a5a1f" />
            <circle cx="60" cy="120" r="4" fill="#3a5a1f" />
          </svg>
          <span className="relative font-imt-display text-4xl font-bold tracking-tight text-imt-accent transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transition-none sm:text-5xl">
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
