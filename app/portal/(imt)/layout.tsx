import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/comunidad/BrandMark";
import { createSupabaseServer } from "@/lib/supabase/server";
import "@/app/comunidad/comunidad.css";

/** Depende de la sesión en cada pedido: nunca se cachea. */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#fafbf7",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Portal de clientes · IA Master Tech",
  robots: { index: false, follow: false },
};

async function haySesion(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

/** Portal de clientes de IA Master Tech: mismo tema y marca que la comunidad (Master IA 360). */
export default async function PortalImtLayout({ children }: { children: ReactNode }) {
  const sesion = await haySesion();

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
          <BrandMark href="/portal" nombre="IA Master Tech" sub="Portal de clientes" />
          {sesion ? (
            <form action="/portal/logout" method="post">
              <button type="submit" className="mia-back inline-flex min-h-11 items-center px-3">
                Salir
              </button>
            </form>
          ) : null}
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  );
}
