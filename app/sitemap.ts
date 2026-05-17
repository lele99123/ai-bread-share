import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://aibreadshare.com";

  // Fetch all recipe IDs for static generation
  const { data: recipes } = await supabase.from("recipes").select("id, updated_at");

  const recipeUrls: MetadataRoute.Sitemap = (recipes || []).map((r) => ({
    url: `${baseUrl}/recipes/${r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...recipeUrls,
  ];
}
