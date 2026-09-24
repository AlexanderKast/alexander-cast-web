"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/content/imt";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/imt/ui/Button";
import { BrandMark } from "./BrandMark";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200",
        scrolled || open ? "border-imt-border bg-imt-bg/85 backdrop-blur-md" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark />

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-imt-muted transition-colors hover:text-imt-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/diagnostico" className={buttonClasses("primary", "sm", "hidden sm:inline-flex")}>
            Agenda tu diagnóstico
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-imt-border text-imt-text transition-colors hover:border-imt-cyan md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      <div id={menuId} hidden={!open} className="border-t border-imt-border md:hidden">
        <nav aria-label="Menú móvil" className="mx-auto w-full max-w-6xl px-4 pb-6 pt-2 sm:px-6">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-3.5 font-imt-display text-lg font-medium text-imt-text transition-colors hover:text-imt-cyan"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/diagnostico"
            onClick={() => setOpen(false)}
            className={buttonClasses("primary", "md", "mt-4 w-full")}
          >
            Agenda tu diagnóstico
          </Link>
        </nav>
      </div>
    </header>
  );
}
