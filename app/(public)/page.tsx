import type { Metadata } from "next";
import { Hero } from "@/components/imt/landing/Hero";
import { Problem } from "@/components/imt/landing/Problem";
import { HowWeWork } from "@/components/imt/landing/HowWeWork";
import { Team } from "@/components/imt/landing/Team";
import { Plans } from "@/components/imt/landing/Plans";
import { Faq } from "@/components/imt/landing/Faq";
import { JsonLd } from "@/components/shared/json-ld";
import {
  buildFAQSchema,
  buildMetadata,
  buildOrganizationSchema,
  buildPeopleSchema,
  buildServiceSchema,
} from "@/lib/seo";
import { site } from "@/content/site";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "IA Master Tech · Desarrollo y automatización para empresas | Alexander Cast",
    description: site.description,
    path: "/",
  }),
  // Full title on the home page, without the layout's "%s | IA Master Tech" template.
  title: { absolute: "IA Master Tech · Desarrollo y automatización para empresas | Alexander Cast" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd
        schema={[buildOrganizationSchema(), ...buildPeopleSchema(), buildServiceSchema(), buildFAQSchema()]}
      />
      <Hero />
      <Problem />
      <HowWeWork />
      <Team />
      <Plans />
      <Faq />
    </>
  );
}
