import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { author_name, user_id } = await req.json();

    if (!author_name || !user_id) {
      return NextResponse.json({ error: "Missing author_name or user_id" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Claim all recipes by this author_name that don't have an author_id yet
    const { data, error } = await supabase
      .from("recipes")
      .update({ author_id: user_id })
      .eq("author_name", author_name)
      .is("author_id", null)
      .select("id, title");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      claimed: data?.length || 0,
      recipes: data
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
