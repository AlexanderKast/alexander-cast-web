import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteHeader } from "@/components/imt/layout/SiteHeader";
import { SiteFooter } from "@/components/imt/layout/SiteFooter";
import { RevealObserver } from "@/components/imt/ui/RevealObserver";
import { SystemsCanvas } from "@/components/imt/ui/SystemsCanvas";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/content/site";

export const viewport: Viewport = {
  themeColor: "#050705",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const TITLE = "IA Master Tech · Desarrollo y automatización para empresas | Alexander Cast";

export const metadata: Metadata = {
  ...buildMetadata({ title: TITLE, description: site.description, path: "/" }),
  title: {
    default: TITLE,
    template: "%s | IA Master Tech",
  },
  keywords: [
    "IA Master Tech",
    "Alexander Cast",
    "desarrollo de software a la medida",
    "automatización de procesos",
    "integraciones Shopify Siigo",
    "dashboards en tiempo real",
    "agentes de IA para empresas",
    "Medellín",
  ],
};

/**
 * Public site shell. `data-theme="imt"` scopes the IA Master Tech tokens
 * (app/imt.css) so admin, portal and brief keep the original theme.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="imt" className="imt-page">
      <a
        href="#contenido"
        className="sr-only z-[70] rounded-full bg-imt-accent px-4 py-2 font-semibold text-imt-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <SystemsCanvas />
      <SiteHeader />
      <main id="contenido" className="relative z-10">
        {children}
      </main>
      <SiteFooter />
      <div className="imt-grain" aria-hidden="true" />
      <RevealObserver />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
