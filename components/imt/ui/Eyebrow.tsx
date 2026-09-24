import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({
  as: Tag = "p",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn("imt-eyebrow", className)}>{children}</Tag>;
}
