import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type LinkButtonProps = BaseProps & {
  href: string;
  /** Opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
};

type NativeButtonProps = BaseProps & {
  href?: undefined;
} & Omit<ComponentProps<"button">, "className" | "children">;

const sizeClass: Record<Size, string> = {
  sm: "imt-btn-sm",
  md: "",
  lg: "imt-btn-lg",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn("imt-btn", `imt-btn-${variant}`, sizeClass[size], className);
}

export function Button(props: LinkButtonProps | NativeButtonProps) {
  const classes = buttonClasses(props.variant, props.size, props.className);

  if (props.href !== undefined) {
    if (props.external) {
      return (
        <a href={props.href} className={classes} target="_blank" rel="noopener noreferrer">
          {props.children}
        </a>
      );
    }
    return (
      <Link href={props.href} className={classes}>
        {props.children}
      </Link>
    );
  }

  const { variant: _variant, size: _size, className: _className, children, href: _href, type = "button", ...rest } =
    props;
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
