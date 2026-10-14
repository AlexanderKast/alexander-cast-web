import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Raíz del portal: no pinta nada. El portal de agencia (grupo `(agencia)`) y el de IA Master Tech
 * (grupo `(imt)`, con el branding de la comunidad) traen cada uno su propio layout.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PortalRootLayout({ children }: { children: ReactNode }) {
  return children;
}
