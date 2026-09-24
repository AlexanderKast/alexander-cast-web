import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  as?: ElementType;
  className?: string;
  /** Enables the scroll reveal; `delay` staggers it in ms. */
  reveal?: boolean;
  delay?: number;
  children: ReactNode;
};

export function revealProps(reveal: boolean | undefined, delay = 0) {
  if (!reveal) return {};
  return {
    "data-reveal": "",
    style: { "--reveal-delay": `${delay}ms` } as CSSProperties,
  };
}

export function Card({ as: Tag = "div", className, reveal, delay = 0, children }: CardProps) {
  return (
    <Tag className={cn("imt-card p-6 sm:p-8", className)} {...revealProps(reveal, delay)}>
      {children}
    </Tag>
  );
}
