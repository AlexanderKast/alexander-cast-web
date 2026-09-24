import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = site.url.replace(/\/$/, "");

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/como-trabajamos`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/planes`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/diagnostico`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/nosotros`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/legal/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
