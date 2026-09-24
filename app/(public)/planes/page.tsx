import type { Metadata } from "next";
import { PageHeader } from "@/components/imt/ui/PageHeader";
import { Plans } from "@/components/imt/landing/Plans";
import { Faq } from "@/components/imt/landing/Faq";
import { FinalCta } from "@/components/imt/landing/FinalCta";
import { JsonLd } from "@/components/shared/json-ld";
import { buildFAQSchema, buildMetadata, buildServiceSchema } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Planes",
  description:
    "Automatiza, Acelera y Escala: un equipo de desarrollo completo por un fee mensual en COP, desde $3.900.000. Contrato mínimo de 3 meses.",
  path: "/planes",
});

export default function PlanesPage() {
  return (
    <>
      <JsonLd schema={[buildServiceSchema(), buildFAQSchema()]} />
      <PageHeader
        id="planes-title"
        eyebrow="Inversión"
        title={
          <>
            Un equipo de desarrollo completo <span className="imt-text-glow">por menos que un empleado.</span>
          </>
        }
        intro="Un desarrollador en nómina supera los $7.000.000 al mes. Una casa de software cobra desde $30.000.000 por proyecto, y tarda meses."
      />
      <Plans />
      <Faq />
      <FinalCta />
    </>
  );
}
