import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get("recipe_id");
  const limit = parseInt(searchParams.get("limit") || "4");

  if (!recipeId) {
    return NextResponse.json({ error: "recipe_id required" }, { status: 400 });
  }

  // Get the source recipe
  const { data: source, error: sourceErr } = await supabase
    .from("recipes")
    .select("id, bread_type, ai_model, tags:recipe_branches(tags)")
    .eq("id", recipeId)
    .single();

  if (sourceErr || !source) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  // Flatten tags from branches
  const sourceTags: string[] = (source as any).recipe_branches
    ?.flatMap((b: any) => b.tags || [])
    || [];

  const sourceBreadType = source.bread_type;
  const sourceAiModel = source.ai_model;

  // Get all other recipes with branches
  const { data: candidates } = await supabase
    .from("recipes")
    .select(`
      id,
      title,
      bread_type,
      ai_model,
      recipe_branches (
        id,
        outcome_photo_url,
        tags
      )
    `)
    .neq("id", recipeId)
    .limit(50);

  if (!candidates) {
    return NextResponse.json({ recommendations: [] });
  }

  // Score each candidate
  const scored = candidates.map((r: any) => {
    let score = 0;
    const branchTags: string[] = r.recipe_branches?.flatMap((b: any) => b.tags || []) || [];

    if (r.bread_type === sourceBreadType) score += 3;
    if (r.ai_model === sourceAiModel) score += 1;

    // Tag overlap bonus
    for (const tag of sourceTags) {
      if (branchTags.includes(tag)) score += 2;
    }

    // Prefer recipes with photos
    const hasPhoto = r.recipe_branches?.some((b: any) => b.outcome_photo_url);
    if (hasPhoto) score += 1;

    return { ...r, score, topBranch: r.recipe_branches?.find((b: any) => b.outcome_photo_url) || r.recipe_branches?.[0] };
  });

  // Sort by score descending, take top N
  const recommendations = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(r => r.score > 0)
    .map(({ score, topBranch, ...rest }) => ({ ...rest, score, outcome_photo_url: topBranch?.outcome_photo_url || null }));

  return NextResponse.json({ recommendations });
}
