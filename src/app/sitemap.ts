import type { MetadataRoute } from "next";

import { createSupabaseServerClient } from "../../lib/supabase/server";

const SITE = "https://weeklyfinancebrief.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/issues`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("issues")
      .select("week_label, sent_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(200);
    const issueRoutes: MetadataRoute.Sitemap = (data ?? []).map((i) => ({
      url: `${SITE}/issues/${i.week_label}`,
      lastModified: i.sent_at ? new Date(i.sent_at) : undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
    return [...staticRoutes, ...issueRoutes];
  } catch {
    return staticRoutes;
  }
}
