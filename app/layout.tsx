import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  Fraunces,
  Bebas_Neue,
  Space_Grotesk,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import Script from "next/script";
import { site } from "@/content/site";
import { REVEAL_BOOTSTRAP } from "@/components/imt/ui/reveal-bootstrap";
import "./globals.css";

/*
 * Las tres familias se sirven desde next/font (self-hosted y subsetadas).
 * Antes convivian dos sistemas: el root cargaba Inter + Playfair y el chrome
 * publico inyectaba un <link> bloqueante a Google Fonts con DM Sans + Bebas.
 * Resultado: fuentes de mas, render bloqueado y un flash de texto sin estilo.
 */

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  style: ["normal", "italic"],
});

/* Reemplaza a Playfair: variable, con mas caracter y legible tanto a 12px en
   las tablas del panel como a 96px en los titulares del sitio. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

/* Solo para los titulares condensados del chrome publico. */
const bebas = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
  weight: ["400"],
});

/* IA Master Tech (public site, scoped by data-theme="imt"): display, body
   and technical labels. Admin, portal and brief keep the fonts above. */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const TITULO_POR_DEFECTO =
  "IA Master Tech · Desarrollo y automatización para empresas | Alexander Cast";
const DESCRIPCION_POR_DEFECTO = site.description;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: TITULO_POR_DEFECTO,
    template: "%s — Alexander Cast",
  },
  description: DESCRIPCION_POR_DEFECTO,
  robots: { index: true, follow: true },
  // Canonical y Open Graph por defecto: sin esto, las paginas que no llaman
  // a buildMetadata() quedaban sin canonical y sin imagen al compartirlas.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "es_CO",
    url: site.url,
    title: TITULO_POR_DEFECTO,
    description: DESCRIPCION_POR_DEFECTO,
    images: [{ url: site.ogImage, width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO_POR_DEFECTO,
    description: DESCRIPCION_POR_DEFECTO,
    images: [site.ogImage],
  },
};

/**
 * Root layout minimalista — solo provee el shell HTML/CSS base.
 * El header, footer y CSS específico de cada sección lo provee
 * el layout anidado: (public)/layout.tsx para el sitio público,
 * admin/layout.tsx para el panel de administración.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${fraunces.variable} ${bebas.variable} ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-screen antialiased">
        {/* Arms the public site's scroll reveal before first paint; no-op elsewhere. */}
        <Script id="imt-reveal-bootstrap" strategy="beforeInteractive">
          {REVEAL_BOOTSTRAP}
        </Script>
        {children}
      </body>
    </html>
  );
}
