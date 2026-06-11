import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Don't index app/account/ops surfaces or API routes.
      disallow: ["/account", "/admin", "/welcome", "/api/", "/unsubscribe"],
    },
    sitemap: "https://weeklyfinancebrief.com/sitemap.xml",
  };
}
