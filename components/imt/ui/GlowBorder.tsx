import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { revealProps } from "./Card";

type GlowBorderProps = {
  as?: ElementType;
  /** Keeps the rotating border on permanently (featured elements). */
  active?: boolean;
  className?: string;
  reveal?: boolean;
  delay?: number;
  children: ReactNode;
};

/** Card whose border turns into a rotating conic gradient on hover. */
export function GlowBorder({
  as: Tag = "div",
  active = false,
  className,
  reveal,
  delay = 0,
  children,
}: GlowBorderProps) {
  return (
    <Tag
      className={cn("imt-glow-border", className)}
      data-active={active ? "true" : undefined}
      {...revealProps(reveal, delay)}
    >
      {children}
    </Tag>
  );
}
