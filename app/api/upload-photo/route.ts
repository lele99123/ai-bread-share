import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const branchId = formData.get("branch_id") as string;
    const photo = formData.get("photo") as File;

    if (!branchId || !photo) {
      return NextResponse.json({ error: "Missing branch_id or photo" }, { status: 400 });
    }

    // Use access token from Authorization header to validate session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get branch to check ownership
    const { data: branch, error: branchErr } = await supabase
      .from("recipe_branches")
      .select("recipe_id, recipes!inner(author_id)")
      .eq("id", branchId)
      .single();

    if (branchErr || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Verify ownership: recipe author must be the logged-in user
    const { data: recipe } = await supabase
      .from("recipes")
      .select("author_id")
      .eq("id", branch.recipe_id)
      .single();

    if (!recipe || recipe.author_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upload photo to storage
    const ext = photo.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("outcome-photos")
      .upload(fileName, photo);

    if (uploadErr) {
      return NextResponse.json({ error: "Upload failed: " + uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("outcome-photos").getPublicUrl(fileName);

    // Update branch with photo URL
    const { error: updateErr } = await supabase
      .from("recipe_branches")
      .update({ outcome_photo_url: urlData.publicUrl })
      .eq("id", branchId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update branch" }, { status: 500 });
    }

    return NextResponse.json({ success: true, outcome_photo_url: urlData.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}