import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getMiembro } from "@/lib/comunidad/auth";
import { BrandMark } from "@/components/comunidad/BrandMark";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";
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

const enlaceNav = "mia-back inline-flex min-h-11 items-center px-3";

export default async function ComunidadLayout({ children }: { children: ReactNode }) {
  const miembro = await getMiembro();

  return (
    <div data-theme="mia" className="mia-page">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Saltar al contenido
      </a>
      <header className="mia-header px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
          {/* Visitante: la marca lleva a la landing. Miembro: a su área. */}
          <BrandMark href={miembro ? "/comunidad" : "/comunidad/unete"} />
          <nav aria-label="Principal" className="flex items-center gap-1">
            {miembro ? (
              <>
                <Link href="/comunidad/mi-cuenta" className={enlaceNav}>
                  Mi cuenta
                </Link>
                {miembro.rol === "admin" ? (
                  <Link href="/comunidad/admin" className={botonSecundarioCls}>
                    Admin
                  </Link>
                ) : null}
                <form action="/comunidad/salir" method="post">
                  <button type="submit" className={enlaceNav}>
                    Salir
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/comunidad/unete" className={enlaceNav + " hidden sm:inline-flex"}>
                  Programa
                </Link>
                <Link href="/comunidad/login" className={enlaceNav}>
                  Iniciar sesión
                </Link>
                <Link href="/comunidad/registro" className={botonCls + " mia-btn-sm"}>
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
