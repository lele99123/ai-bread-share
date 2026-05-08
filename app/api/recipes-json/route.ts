import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select(`
        id,
        title,
        title_en,
        title_cn,
        ai_model,
        bread_type,
        description,
        description_en,
        description_cn,
        notes,
        notes_en,
        notes_cn,
        author_name,
        created_at,
        recipe_branches (
          id,
          title,
          title_en,
          title_cn,
          final_recipe,
          final_recipe_en,
          final_recipe_cn,
          notes,
          notes_en,
          notes_cn,
          tags,
          outcome_photo_url,
          chat_line_start,
          chat_line_end
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (recipes || []).map((r: any) => ({
      id: r.id,
      title: r.title_en || r.title,
      titleZh: r.title_cn || r.title_en || r.title,
      aiModel: r.ai_model,
      breadType: r.bread_type,
      description: r.description_en || r.description,
      descriptionZh: r.description_cn || r.description_en || r.description,
      notes: r.notes_en || r.notes,
      notesZh: r.notes_cn || r.notes_en || r.notes,
      author: r.author_name,
      publishedAt: r.created_at,
      branches: (r.recipe_branches || []).map((b: any) => ({
        id: b.id,
        title: b.title_en || b.title,
        titleZh: b.title_cn || b.title_en || b.title,
        recipe: b.final_recipe_en || b.final_recipe,
        recipeZh: b.final_recipe_cn || b.final_recipe_en || b.final_recipe,
        notes: b.notes_en || b.notes,
        notesZh: b.notes_cn || b.notes_en || b.notes,
        tags: b.tags || [],
        photoUrl: b.outcome_photo_url,
        chatLineStart: b.chat_line_start,
        chatLineEnd: b.chat_line_end,
      })),
    }));

    return NextResponse.json(
      {
        format: "ai-bread-share-v1",
        count: formatted.length,
        recipes: formatted,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
