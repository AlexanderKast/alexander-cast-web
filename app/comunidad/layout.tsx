import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getMiembro } from "@/lib/comunidad/auth";
import { BrandMark } from "@/components/comunidad/BrandMark";
import { botonSecundarioCls } from "@/components/comunidad/ui";
import "./comunidad.css";

/** Depende de la sesión en cada pedido: nunca se cachea. */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#fafbf7",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Master IA 360 · Comunidad",
  robots: { index: false, follow: false },
};

export default async function ComunidadLayout({ children }: { children: ReactNode }) {
  const miembro = await getMiembro();

  return (
    <div data-theme="mia" className="mia-page">
      <header className="mia-header px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <BrandMark />
          {miembro ? (
            <div className="flex items-center gap-2">
              {miembro.rol === "admin" ? (
                <Link href="/comunidad/admin" className={botonSecundarioCls}>
                  Admin
                </Link>
              ) : null}
              <form action="/comunidad/salir" method="post">
                <button type="submit" className="mia-back min-h-11 px-3">
                  Salir
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
    </div>
  );
}
