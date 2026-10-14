import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-12 w-full rounded-xl border border-imt-border bg-imt-bg px-4 text-base text-imt-text outline-none transition-[border-color,box-shadow,background-color] duration-300 ease-out placeholder:text-imt-dim hover:border-imt-border-solid focus-visible:border-imt-accent focus-visible:bg-imt-elev focus-visible:shadow-[0_0_0_4px_rgba(163,230,53,0.15),0_12px_32px_-16px_rgba(163,230,53,0.45)] aria-[invalid=true]:border-red-300";

export function Campo({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-imt-text">
        {label}
        <span className="text-imt-accent" aria-hidden="true">
          {" "}
          *
        </span>
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-imt-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
