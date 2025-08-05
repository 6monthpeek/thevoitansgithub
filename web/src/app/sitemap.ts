import type { MetadataRoute } from "next";

const LOCALES = ["tr", "en"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3030";

  // Basit statik sayfalar listesi (gerekirse genişletilebilir)
  const paths = [
    "",            // home
    "/about",
    "/members",
    "/announcements",
    "/schedule",
    "/streams",
    "/join",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const p of paths) {
      const url = `${base}/${locale}${p}`;
      entries.push({
        url,
        changeFrequency: "weekly",
        priority: p === "" ? 1 : 0.8,
        lastModified: new Date(),
        alternates: {
          languages: {
            tr: url.replace(`/${locale}`, "/tr"),
            en: url.replace(`/${locale}`, "/en"),
          },
        },
      });
    }
  }

  return entries;
}
