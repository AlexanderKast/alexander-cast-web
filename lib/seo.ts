import type { Metadata } from "next";
import { site } from "@/content/site";
import { FAQS, PLANS, TEAM } from "@/content/imt";

const DEFAULT_IMAGE = site.ogImage;

type BuildMetadataInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noindex?: boolean;
};

/**
 * Factory de Metadata Next.js con Open Graph + Twitter Cards.
 */
export function buildMetadata({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  noindex = false,
}: BuildMetadataInput): Metadata {
  const url = new URL(path, site.url).toString();
  const absoluteImage = image.startsWith("http")
    ? image
    : new URL(image, site.url).toString();

  return {
    metadataBase: new URL(site.url),
    title,
    description,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: "website",
      locale: "es_CO",
      url,
      siteName: `${site.name} · ${site.producto}`,
      title,
      description,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteImage],
    },
  };
}

const ORG_ID = `${site.url}/#organization`;

function personId(slug: string) {
  return `${site.url}/nosotros#${slug}`;
}

/** JSON-LD Organization for IA Master Tech (endorsed by Alexander Cast). */
export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: site.producto,
    alternateName: `${site.name} · ${site.producto}`,
    url: site.url,
    description: site.description,
    logo: new URL("/icon.png", site.url).toString(),
    image: new URL(DEFAULT_IMAGE, site.url).toString(),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Medellín",
      addressCountry: "CO",
    },
    areaServed: ["CO", "LATAM"],
    sameAs: [site.social.instagram.url],
    founder: TEAM.map((member) => ({ "@id": personId(member.slug) })),
    employee: TEAM.map((member) => ({ "@id": personId(member.slug) })),
  };
}

/** JSON-LD Person for each team member. */
export function buildPeopleSchema(): Record<string, unknown>[] {
  return TEAM.map((member) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId(member.slug),
    name: member.name,
    jobTitle: member.role,
    description: member.bio.join(" "),
    worksFor: { "@id": ORG_ID },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Medellín",
      addressCountry: "CO",
    },
    ...(member.slug === "alexander" ? { sameAs: [site.social.linkedin.url] } : {}),
  }));
}

/** JSON-LD Service with the three monthly plans, priced in COP ("desde"). */
export function buildServiceSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${site.producto} — Desarrollo y automatización`,
    serviceType: "Desarrollo de software y automatización de procesos",
    description: site.description,
    provider: { "@id": ORG_ID },
    areaServed: ["CO", "LATAM"],
    availableLanguage: site.idiomas,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Planes mensuales",
      itemListElement: PLANS.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        description: `${plan.description} ${plan.hours} · ${plan.projects}.`,
        url: new URL(`/planes#${plan.id}`, site.url).toString(),
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          minPrice: plan.priceCop,
          priceCurrency: "COP",
          unitText: "MONTH",
        },
      })),
    },
  };
}

/** JSON-LD FAQPage with the landing FAQ. */
export function buildFAQSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
