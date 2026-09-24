import type { MetadataRoute } from "next";
import { site } from "@/content/site";

// Private areas: panel, client portal, client onboarding and client briefs.
const DISALLOW = ["/api/", "/admin/", "/portal/", "/clientes/", "/brief/", "/gracias"];

export default function robots(): MetadataRoute.Robots {
  const allowedBots = [
    "Googlebot",
    "Bingbot",
    "GPTBot",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended",
    "CCBot",
    "Applebot-Extended",
  ];

  return {
    rules: [
      ...allowedBots.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
