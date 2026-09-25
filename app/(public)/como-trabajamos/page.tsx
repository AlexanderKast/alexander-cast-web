import type { Metadata } from "next";
import { PageHeader } from "@/components/imt/ui/PageHeader";
import { Marquee } from "@/components/imt/landing/Marquee";
import { ResultsBento, StepsZigzag, WeeklyLog } from "@/components/imt/landing/HowWeWork";
import { FinalCta } from "@/components/imt/landing/FinalCta";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cómo trabajamos",
  description:
    "Diagnosticamos, construimos y operamos: automatizaciones, integraciones, dashboards, software a la medida y agentes de IA con un sprint semanal en producción.",
  path: "/como-trabajamos",
});

export default function ComoTrabajamosPage() {
  return (
    <>
      <PageHeader
        id="como-title"
        eyebrow="Qué hacemos"
        title={
          <>
            Nos convertimos en tu <span className="imt-text-glow">equipo de desarrollo.</span>
          </>
        }
        intro="Diagnosticamos, construimos y operamos. Con un sprint semanal que ves funcionando."
      />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Marquee />
      </div>
      <StepsZigzag />
      <WeeklyLog />
      <ResultsBento />
      <FinalCta next={{ href: "/planes", label: "Ver los planes" }} />
    </>
  );
}
