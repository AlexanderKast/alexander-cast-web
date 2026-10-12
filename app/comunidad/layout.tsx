import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getMiembro } from "@/lib/comunidad/auth";

/** Depende de la sesión en cada pedido: nunca se cachea. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Master IA 360 · Comunidad",
  robots: { index: false, follow: false },
};

export default async function ComunidadLayout({ children }: { children: ReactNode }) {
  const miembro = await getMiembro();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/comunidad" className="flex items-center gap-2">
            <span className="text-sm font-semibold">Master IA 360</span>
            <span className="rounded-full border border-line-strong px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Comunidad
            </span>
          </Link>
          {miembro ? (
            <div className="flex items-center gap-3">
              {miembro.rol === "admin" ? (
                <Link href="/comunidad/admin" className="text-sm text-gold hover:underline">
                  Admin
                </Link>
              ) : null}
              <form action="/comunidad/salir" method="post">
                <button
                  type="submit"
                  className="min-h-11 px-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Salir
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
