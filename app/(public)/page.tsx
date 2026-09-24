import type { Metadata } from "next";
import { Hero } from "@/components/imt/landing/Hero";
import { Problem } from "@/components/imt/landing/Problem";
import { Explore } from "@/components/imt/landing/Explore";
import { ToolsStrip } from "@/components/imt/landing/ToolsStrip";
import { ChaosToSystem } from "@/components/imt/landing/ChaosToSystem";
import { CircuitDivider } from "@/components/imt/ui/CircuitDivider";
import { CostCalculator } from "@/components/imt/landing/CostCalculator";
import { FirstMonth } from "@/components/imt/landing/FirstMonth";
import { FinalCta } from "@/components/imt/landing/FinalCta";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, buildOrganizationSchema, buildPeopleSchema } from "@/lib/seo";
import { site } from "@/content/site";

const TITLE = "IA Master Tech · Desarrollo y automatización para empresas | Alexander Cast";

export const metadata: Metadata = {
  ...buildMetadata({ title: TITLE, description: site.description, path: "/" }),
  // Full title on the home page, without the layout's "%s | IA Master Tech" template.
  title: { absolute: TITLE },
};

export default function HomePage() {
  return (
    <>
      <JsonLd schema={[buildOrganizationSchema(), ...buildPeopleSchema()]} />
      <Hero />
      <ToolsStrip />
      <Problem />
      <ChaosToSystem />
      <CircuitDivider />
      <CostCalculator />
      <CircuitDivider flip />
      <FirstMonth />
      <CircuitDivider />
      <Explore />
      <FinalCta />
    </>
  );
}
